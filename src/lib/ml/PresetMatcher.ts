/**
 * PresetMatcher - Intelligent Pattern Matching Engine
 * 
 * Provides rule-based preset suggestions based on window grid features.
 * Designed to be ML-ready: collects user confirmation data for future training.
 * 
 * Phase 3: Intelligent UX - Smart Preset Suggestions
 * 
 * @since Phase 3: Intelligent UX (Week 5-7)
 */

import { EGYPTIAN_PATTERNS, type EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowGrid } from '@/types/fabricator';

/**
 * Extracted features from a window grid
 */
export interface GridFeatures {
  rows: number;
  cols: number;
  totalCells: number;
  sashCount: number;
  fixedCount: number;
  slidingCount: number;
  emptyCount: number;
  aspectRatio: number; // width/height
  hasMullions: boolean;
  hasTransoms: boolean;
  openingDirections: Set<string>;
  colProportions?: number[]; // colWidths if available
  rowProportions?: number[]; // rowHeights if available
}

/**
 * Pattern match result with confidence score
 */
export interface PatternMatch {
  pattern: EgyptianPattern;
  confidence: number; // 0-100
  matchingFeatures: string[];
  missingFeatures: string[];
}

/**
 * Preset matching result
 */
export interface PresetMatchResult {
  matches: PatternMatch[];
  topMatch?: PatternMatch;
  suggestions: EgyptianPattern[]; // Top 2-3 matches
}

/**
 * PresetMatcher - Rule-based pattern matching engine
 * 
 * Extracts features from WindowGrid and matches against Egyptian patterns.
 * Returns top 2-3 suggestions with confidence scores.
 * 
 * Future: ML enhancement with TensorFlow.js after collecting user confirmation data.
 */
export class PresetMatcher {
  private patterns: EgyptianPattern[] = EGYPTIAN_PATTERNS;
  
  /**
   * Extract features from window grid
   */
  extractFeatures(grid: WindowGrid, dimensions?: { width: number; height: number }): GridFeatures {
    const features: GridFeatures = {
      rows: grid.rows,
      cols: grid.cols,
      totalCells: grid.cells.length,
      sashCount: 0,
      fixedCount: 0,
      slidingCount: 0,
      emptyCount: 0,
      aspectRatio: dimensions ? dimensions.width / dimensions.height : 1,
      hasMullions: false,
      hasTransoms: false,
      openingDirections: new Set(),
      colProportions: grid.colWidths,
      rowProportions: grid.rowHeights
    };
    
    // Count cell types
    grid.cells.forEach(cell => {
      switch (cell.type) {
        case 'sash':
          features.sashCount++;
          break;
        case 'fixed':
        case 'panel':
          features.fixedCount++;
          break;
        case 'sliding':
          features.slidingCount++;
          break;
        case 'empty':
          features.emptyCount++;
          break;
      }
      
      // Track opening directions
      if (cell.openingDirection) {
        features.openingDirections.add(cell.openingDirection);
      }
    });
    
    // Detect mullions (vertical divisions - multiple columns)
    features.hasMullions = grid.cols > 1;
    
    // Detect transoms (horizontal divisions - multiple rows)
    features.hasTransoms = grid.rows > 1;
    
    return features;
  }
  
  /**
   * Match grid features against patterns
   * 
   * Returns top matches with confidence scores (0-100)
   */
  matchPatterns(
    grid: WindowGrid,
    dimensions?: { width: number; height: number },
    systemPackId?: string | null
  ): PresetMatchResult {
    const features = this.extractFeatures(grid, dimensions);
    
    // Filter patterns by system pack compatibility if specified
    const candidatePatterns = systemPackId
      ? this.patterns.filter(p => p.compatibleSystems.includes(systemPackId))
      : this.patterns;
    
    // Score each pattern
    const matches: PatternMatch[] = candidatePatterns.map(pattern => {
      const score = this.scorePattern(pattern, features, grid);
      return {
        pattern,
        confidence: score.confidence,
        matchingFeatures: score.matchingFeatures,
        missingFeatures: score.missingFeatures
      };
    });
    
    // Sort by confidence (descending)
    matches.sort((a, b) => b.confidence - a.confidence);
    
    // Get top 2-3 matches (suggestions)
    const topMatches = matches.slice(0, 3);
    const suggestions = topMatches.map(m => m.pattern);
    
    return {
      matches,
      topMatch: matches[0],
      suggestions
    };
  }
  
  /**
   * Score a pattern against grid features
   * 
   * Returns confidence score (0-100) and feature analysis
   */
  private scorePattern(
    pattern: EgyptianPattern,
    features: GridFeatures,
    grid?: WindowGrid
  ): {
    confidence: number;
    matchingFeatures: string[];
    missingFeatures: string[];
  } {
    const matchingFeatures: string[] = [];
    const missingFeatures: string[] = [];
    let score = 0;
    let maxScore = 0;
    
    const patternGrid = pattern.gridSpec;
    
    // 1. Grid dimensions match (30 points)
    maxScore += 30;
    if (patternGrid.rows === features.rows && patternGrid.cols === features.cols) {
      score += 30;
      matchingFeatures.push('Grid dimensions match');
    } else {
      missingFeatures.push(`Grid dimensions: ${features.rows}x${features.cols} vs ${patternGrid.rows}x${patternGrid.cols}`);
    }
    
    // 2. Cell type distribution (25 points)
    maxScore += 25;
    const patternSashCount = patternGrid.cells.filter(c => c.type === 'sash').length;
    const patternFixedCount = patternGrid.cells.filter(c => c.type === 'fixed' || c.type === 'panel').length;
    const patternSlidingCount = patternGrid.cells.filter(c => c.type === 'sliding').length;
    
    let cellTypeScore = 0;
    if (patternSashCount === features.sashCount) {
      cellTypeScore += 8;
      matchingFeatures.push('Sash count matches');
    }
    if (patternFixedCount === features.fixedCount) {
      cellTypeScore += 8;
      matchingFeatures.push('Fixed count matches');
    }
    if (patternSlidingCount === features.slidingCount) {
      cellTypeScore += 9;
      matchingFeatures.push('Sliding count matches');
    }
    score += cellTypeScore;
    
    if (cellTypeScore < 25) {
      missingFeatures.push(`Cell types: ${features.sashCount}s/${features.fixedCount}f/${features.slidingCount}sl vs ${patternSashCount}s/${patternFixedCount}f/${patternSlidingCount}sl`);
    }
    
    // 3. Opening mechanism match (20 points)
    maxScore += 20;
    if (pattern.openingMechanism) {
      const patternType = pattern.openingMechanism.type;
      if (features.slidingCount > 0 && patternType === 'sliding') {
        score += 20;
        matchingFeatures.push('Sliding mechanism matches');
      } else if (features.sashCount > 0 && (patternType === 'casement' || patternType === 'tilt-turn')) {
        score += 20;
        matchingFeatures.push('Casement/tilt-turn mechanism matches');
      } else if (features.fixedCount === features.totalCells && patternType === 'fixed') {
        score += 20;
        matchingFeatures.push('Fixed mechanism matches');
      } else {
        missingFeatures.push(`Opening mechanism: ${patternType} doesn't match grid`);
      }
    }
    
    // 4. Mullion/transom presence (15 points)
    maxScore += 15;
    const patternHasMullions = pattern.mullions && pattern.mullions.length > 0;
    const patternHasTransoms = pattern.transoms && pattern.transoms.length > 0;
    
    if (patternHasMullions === features.hasMullions) {
      score += 8;
      matchingFeatures.push('Mullion presence matches');
    } else {
      missingFeatures.push(`Mullions: ${features.hasMullions} vs ${patternHasMullions}`);
    }
    
    if (patternHasTransoms === features.hasTransoms) {
      score += 7;
      matchingFeatures.push('Transom presence matches');
    } else {
      missingFeatures.push(`Transoms: ${features.hasTransoms} vs ${patternHasTransoms}`);
    }
    
    // 5. Cell type positions (10 points) - approximate match
    maxScore += 10;
    let positionScore = 0;
    if (grid && grid.cells) {
      patternGrid.cells.forEach((patternCell, index) => {
        const userCellIndex = features.cols > 0 && features.rows > 0
          ? features.cols * patternCell.row + patternCell.col
          : index;
        const gridCell = grid.cells[userCellIndex];
        
        if (gridCell && gridCell.type === patternCell.type) {
          positionScore += 1;
        }
      });
      
      if (positionScore > 0) {
        const positionMatchRatio = positionScore / patternGrid.cells.length;
        score += Math.floor(positionMatchRatio * 10);
        if (positionMatchRatio > 0.8) {
          matchingFeatures.push('Cell positions match well');
        }
      } else {
        missingFeatures.push('Cell positions don\'t match');
      }
    } else {
      // Grid not available, skip position matching
      missingFeatures.push('Cell positions: grid not available for comparison');
    }
    
    // Calculate final confidence (0-100)
    const confidence = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    
    return {
      confidence,
      matchingFeatures,
      missingFeatures
    };
  }
  
  /**
   * Suggest presets for a given grid
   * 
   * Returns top 2-3 pattern suggestions with confidence scores
   */
  suggestPresets(
    grid: WindowGrid,
    dimensions?: { width: number; height: number },
    systemPackId?: string | null
  ): PatternMatch[] {
    const result = this.matchPatterns(grid, dimensions, systemPackId);
    return result.suggestions.map((pattern, index) => {
      const match = result.matches.find(m => m.pattern.id === pattern.id);
      return match || {
        pattern,
        confidence: 0,
        matchingFeatures: [],
        missingFeatures: []
      };
    });
  }
  
  /**
   * Log user confirmation for ML training data collection
   * 
   * Future: Store in database for TensorFlow.js model training
   */
  logUserConfirmation(
    grid: WindowGrid,
    suggestedPattern: EgyptianPattern,
    confirmedPattern: EgyptianPattern | null,
    dimensions?: { width: number; height: number }
  ): void {
    const features = this.extractFeatures(grid, dimensions);
    
    // Log to console for now (future: send to analytics/ML training service)
    console.log('[PresetMatcher] User confirmation logged:', {
      timestamp: new Date().toISOString(),
      suggestedPattern: suggestedPattern.id,
      confirmedPattern: confirmedPattern?.id || 'none',
      features: {
        rows: features.rows,
        cols: features.cols,
        sashCount: features.sashCount,
        fixedCount: features.fixedCount,
        slidingCount: features.slidingCount,
        aspectRatio: features.aspectRatio
      },
      wasCorrect: suggestedPattern.id === confirmedPattern?.id
    });
    
    // TODO: Send to analytics service for ML training data collection
    // This will enable future TensorFlow.js model training
  }
}

/**
 * Singleton instance
 */
export const presetMatcher = new PresetMatcher();

