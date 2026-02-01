// src/components/fabricator/drafting/TemplateRecommendationPanel.tsx
import { AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useDraftingContext } from './DraftingContext';
import type { EgyptianTemplate, Rectangle } from './types/drafting';
import { getBestTemplate, recommendTemplate, type DesignConstraints } from './utils/templateRecommender';

interface TemplateRecommendationPanelProps {
  constraints?: DesignConstraints;
}

/**
 * Calculate preferred dimensions from template constraints
 * Uses midpoint of min/max range as preferred dimensions
 */
function calculatePreferredDimensions(
  template: EgyptianTemplate,
  currentRect?: Rectangle
): { width: number; height: number } {
  const { constraints } = template;
  
  // Calculate preferred dimensions (midpoint of range)
  const preferredWidth = (constraints.minWidth + constraints.maxWidth) / 2;
  const preferredHeight = (constraints.minHeight + constraints.maxHeight) / 2;
  
  // If we have a current rectangle, try to preserve aspect ratio if current dimensions are in range
  if (currentRect) {
    const currentAspectRatio = currentRect.width / currentRect.height;
    const preferredAspectRatio = preferredWidth / preferredHeight;
    
    // If current dimensions are within template range, keep them
    if (
      currentRect.width >= constraints.minWidth &&
      currentRect.width <= constraints.maxWidth &&
      currentRect.height >= constraints.minHeight &&
      currentRect.height <= constraints.maxHeight
    ) {
      return {
        width: currentRect.width,
        height: currentRect.height
      };
    }
    
    // If aspect ratios are close (within 10%), preserve aspect ratio
    if (Math.abs(currentAspectRatio - preferredAspectRatio) < 0.1) {
      // Scale to fit within template constraints while preserving aspect ratio
      let scaledWidth = preferredWidth;
      let scaledHeight = preferredHeight;
      
      if (currentAspectRatio > preferredAspectRatio) {
        // Wider than preferred - use max width, scale height
        scaledWidth = Math.min(preferredWidth * 1.2, constraints.maxWidth);
        scaledHeight = scaledWidth / currentAspectRatio;
        if (scaledHeight < constraints.minHeight) {
          scaledHeight = constraints.minHeight;
          scaledWidth = scaledHeight * currentAspectRatio;
        } else if (scaledHeight > constraints.maxHeight) {
          scaledHeight = constraints.maxHeight;
          scaledWidth = scaledHeight * currentAspectRatio;
        }
      } else {
        // Taller than preferred - use max height, scale width
        scaledHeight = Math.min(preferredHeight * 1.2, constraints.maxHeight);
        scaledWidth = scaledHeight * currentAspectRatio;
        if (scaledWidth < constraints.minWidth) {
          scaledWidth = constraints.minWidth;
          scaledHeight = scaledWidth / currentAspectRatio;
        } else if (scaledWidth > constraints.maxWidth) {
          scaledWidth = constraints.maxWidth;
          scaledHeight = scaledWidth / currentAspectRatio;
        }
      }
      
      return {
        width: Math.round(scaledWidth),
        height: Math.round(scaledHeight)
      };
    }
  }
  
  // Default: use preferred dimensions (midpoint)
  return {
    width: Math.round(preferredWidth),
    height: Math.round(preferredHeight)
  };
}

export const TemplateRecommendationPanel: React.FC<TemplateRecommendationPanelProps> = ({
  constraints = {},
}) => {
  const drafting = useDraftingContext();
  const geometry = drafting.getGeometry();
  const templates = drafting.getAvailableTemplates();
  const selectedElement = drafting.getSelectedElement();

  const recommendations = useMemo(() => {
    if (geometry.rectangles.length === 0) {
      return [];
    }
    return recommendTemplate(geometry, templates, constraints);
  }, [geometry, templates, constraints]);

  const bestMatch = useMemo(() => {
    if (geometry.rectangles.length === 0) {
      return null;
    }
    return getBestTemplate(geometry, templates, constraints);
  }, [geometry, templates, constraints]);

  // Get selected rectangle if one is selected
  const selectedRectangle = useMemo(() => {
    if (selectedElement === null) return null;
    if (selectedElement < geometry.rectangles.length) {
      return geometry.rectangles[selectedElement];
    }
    return null;
  }, [selectedElement, geometry.rectangles]);

  // Apply template to selected rectangle
  const handleApplyTemplate = useCallback((template: EgyptianTemplate) => {
    // Set template as active
    drafting.setTemplate(template.id);
    
    // If a rectangle is selected, apply template dimensions to it
    if (selectedRectangle && selectedElement !== null) {
      try {
        // Verify selectedElement is a valid rectangle index
        if (selectedElement >= geometry.rectangles.length) {
          console.warn('Selected element is not a rectangle:', selectedElement, 'rectangles.length:', geometry.rectangles.length);
          toast.error('Selected element is not a rectangle');
          return;
        }
        
        const preferredDimensions = calculatePreferredDimensions(template, selectedRectangle);
        
        // Check if dimensions actually changed
        if (
          preferredDimensions.width === selectedRectangle.width &&
          preferredDimensions.height === selectedRectangle.height
        ) {
          toast.info(`Template "${template.name}" applied: dimensions unchanged (${preferredDimensions.width}×${preferredDimensions.height}mm)`);
          return;
        }
        
        // Update rectangle with new dimensions (preserve position)
        const updatedRect: Rectangle = {
          ...selectedRectangle,
          width: preferredDimensions.width,
          height: preferredDimensions.height
        };
        
        console.log('Applying template dimensions:', {
          template: template.name,
          currentDimensions: { width: selectedRectangle.width, height: selectedRectangle.height },
          newDimensions: preferredDimensions,
          selectedElement,
          rectangleCount: geometry.rectangles.length
        });
        
        drafting.updateRectangle(selectedElement, updatedRect);
        toast.success(`Template "${template.name}" applied: ${preferredDimensions.width}×${preferredDimensions.height}mm`);
      } catch (error) {
        console.error('Error applying template dimensions:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to apply template dimensions: ${errorMessage}`);
      }
    } else {
      toast.success(`Template "${template.name}" activated`);
    }
  }, [drafting, selectedRectangle, selectedElement, geometry.rectangles.length]);

  if (geometry.rectangles.length === 0) {
    return (
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-blue-400">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">Start drawing to get template recommendations</span>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-amber-400">
          <AlertCircle size={16} />
          <span className="text-sm font-medium">No matching templates found</span>
        </div>
        <p className="text-xs text-amber-600/80 mt-2">
          Your design doesn't match any standard Egyptian templates. Consider adjusting dimensions or structure.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Best Match */}
      {bestMatch && (
        <div className="p-3 bg-green-500/10 border-2 border-green-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-green-400" />
              <span className="text-sm font-semibold text-green-400">Best Match</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-green-300">{bestMatch.score}%</span>
              <CheckCircle size={14} className="text-green-400" />
            </div>
          </div>
          <div className="mb-2">
            <h4 className="text-sm font-medium text-green-100">{bestMatch.templateName}</h4>
            <p className="text-xs text-green-300/80 mt-1">{bestMatch.reason}</p>
          </div>
          <button
            onClick={() => handleApplyTemplate(bestMatch.template)}
            className="w-full mt-2 px-3 py-1.5 bg-green-600/80 hover:bg-green-600 text-white text-xs font-medium rounded transition-colors"
          >
            Apply Template
          </button>
        </div>
      )}

      {/* Other Recommendations */}
      {recommendations.length > 1 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 mb-2">Other Recommendations</h4>
          <div className="space-y-2">
            {recommendations.slice(1, 4).map((rec) => (
              <div
                key={rec.templateId}
                className="p-2 bg-slate-800/50 border border-slate-700/50 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => handleApplyTemplate(rec.template)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-200">{rec.templateName}</span>
                  <span className="text-xs text-slate-500">{rec.score}%</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{rec.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Info */}
      {bestMatch && (
        <div className="p-2 bg-slate-800/50 border border-slate-700/50 rounded text-xs">
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Grid:</span>
            <span className="font-medium text-slate-200">
              {bestMatch.template.rows}×{bestMatch.template.cols}
            </span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Width Range:</span>
            <span className="font-medium text-slate-200">
              {bestMatch.template.constraints.minWidth}–{bestMatch.template.constraints.maxWidth}mm
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Height Range:</span>
            <span className="font-medium text-slate-200">
              {bestMatch.template.constraints.minHeight}–{bestMatch.template.constraints.maxHeight}mm
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

