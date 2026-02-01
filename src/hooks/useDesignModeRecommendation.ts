/**
 * useDesignModeRecommendation - Smart Design Mode Recommendation Hook
 * 
 * Analyzes user context and project characteristics to recommend
 * the best design mode (SmartDraw vs Drafting)
 */

import { useAuth } from '@/context/AuthContext';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { useJobsStore } from '@/store/jobsStore';
import { useMemo } from 'react';
import type { DesignMode } from '@/components/fabricator/DesignModeSelector';

interface Recommendation {
  mode: DesignMode;
  reason: string;
  confidence: number; // 0-1
}

interface ProjectDimensions {
  width: number;
  height: number;
}

/**
 * Calculate complexity score based on dimensions
 * Larger windows or unusual aspect ratios = higher complexity
 */
const calculateComplexity = (dimensions: ProjectDimensions): number => {
  const { width, height } = dimensions;
  const area = width * height;
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  
  // Normalize area (assume typical window is 2000x1500 = 3,000,000 mm²)
  const normalizedArea = Math.min(area / 3000000, 2); // Cap at 2x
  
  // Aspect ratio complexity (square = 1.0, very wide/tall = higher)
  const aspectComplexity = Math.min((aspectRatio - 1) * 0.5, 1);
  
  // Combined complexity (0-1 scale)
  return Math.min((normalizedArea * 0.5 + aspectComplexity * 0.5), 1);
};

/**
 * Analyze project history to determine user's typical complexity
 */
const analyzeProjectHistory = (projects: any[]): number => {
  if (projects.length === 0) return 0;
  
  // Calculate average complexity from project dimensions
  const complexities = projects
    .filter(p => p.overallWidth && p.overallHeight)
    .map(p => calculateComplexity({
      width: p.overallWidth,
      height: p.overallHeight
    }));
  
  if (complexities.length === 0) return 0;
  
  return complexities.reduce((a, b) => a + b, 0) / complexities.length;
};

export const useDesignModeRecommendation = () => {
  const { user } = useAuth();
  const { state } = useFabricatorWorkspace();
  const { jobs } = useJobsStore();

  /**
   * Get recommendation based on current context
   */
  const getRecommendation = useMemo(() => {
    return (dimensions?: ProjectDimensions): Recommendation | null => {
      // Rule 1: First-time user → SmartDraw
      if (jobs.length === 0) {
        return {
          mode: 'smartdraw',
          reason: 'Great for beginners - start with templates',
          confidence: 0.9
        };
      }

      // Rule 2: User role-based recommendation
      if (user?.role === 'architect' || user?.role === 'engineer') {
        return {
          mode: 'drafting',
          reason: 'Professional tools for your role',
          confidence: 0.85
        };
      }

      // Rule 3: Project complexity analysis
      if (dimensions) {
        const complexity = calculateComplexity(dimensions);
        
        if (complexity > 0.7) {
          return {
            mode: 'drafting',
            reason: 'Complex dimensions require CAD precision',
            confidence: 0.8
          };
        }
      }

      // Rule 4: Historical complexity analysis
      const avgComplexity = analyzeProjectHistory(jobs);
      if (avgComplexity > 0.7) {
        return {
          mode: 'drafting',
          reason: 'Your previous designs suggest you need advanced tools',
          confidence: 0.75
        };
      }

      // Rule 5: Current project has custom components
      if (state.currentProject?.components && state.currentProject.components.length > 0) {
        const hasCustomGeometry = state.currentProject.components.some(
          (c: any) => c.type === 'custom' || c.geometry?.type === 'arc'
        );
        
        if (hasCustomGeometry) {
          return {
            mode: 'drafting',
            reason: 'Custom geometry detected - use drafting tools',
            confidence: 0.9
          };
        }
      }

      // Default: SmartDraw for most users
      return {
        mode: 'smartdraw',
        reason: 'Continue with familiar tools',
        confidence: 0.6
      };
    };
  }, [user, jobs, state.currentProject]);

  return { getRecommendation };
};

