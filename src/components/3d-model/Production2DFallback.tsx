/**
 * Production2DFallback - 2D Fallback Renderer
 * 
 * Provides a 2D SVG-based fallback when 3D rendering is not available
 * due to low memory or device limitations.
 * 
 * Week 4 Task 4.1: Production 3D Renderer
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { AlertTriangle } from 'lucide-react';

export interface Production2DFallbackProps {
  windowUnit?: {
    overallWidth: number;
    overallHeight: number;
    components?: Array<{
      width: number;
      height: number;
      role: string;
    }>;
  };
  error?: string;
  errorAr?: string;
  locale?: 'en' | 'ar';
}

/**
 * Production2DFallback - 2D SVG fallback renderer
 */
export function Production2DFallback({
  windowUnit,
  error,
  errorAr,
  locale = 'en',
}: Production2DFallbackProps) {
  const { t: _t, i18n } = useTranslation();
  const currentLocale = locale || (i18n.language.startsWith('ar') ? 'ar' : 'en');

  const width = windowUnit?.overallWidth || 1000;
  const height = windowUnit?.overallHeight || 1000;
  const scale = Math.min(800 / width, 600 / height, 1); // Fit in 800x600 viewport
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  const displayError = currentLocale === 'ar' ? errorAr : error;

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          {currentLocale === 'ar' ? 'عرض ثنائي الأبعاد' : '2D View'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center gap-4">
        {displayError && (
          <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-4 text-center">
            {displayError}
          </div>
        )}
        
        {windowUnit ? (
          <div className="flex flex-col items-center gap-4">
            <svg
              width={scaledWidth}
              height={scaledHeight}
              viewBox={`0 0 ${width} ${height}`}
              className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              {/* Frame outline */}
              <rect
                x="0"
                y="0"
                width={width}
                height={height}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4"
              />
              
              {/* Components */}
              {windowUnit.components?.map((component, index) => (
                <rect
                  key={index}
                  x={width * 0.1}
                  y={height * 0.1 + index * (height * 0.2)}
                  width={component.width || width * 0.8}
                  height={component.height || height * 0.15}
                  fill="rgba(59, 130, 246, 0.1)"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
              ))}
              
              {/* Dimensions */}
              <text
                x={width / 2}
                y={height + 30}
                textAnchor="middle"
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {width}mm × {height}mm
              </text>
            </svg>
            
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {currentLocale === 'ar' 
                ? `العرض: ${width}mm × الارتفاع: ${height}mm`
                : `Width: ${width}mm × Height: ${height}mm`}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            {currentLocale === 'ar' 
              ? 'لا توجد بيانات للنافذة للعرض'
              : 'No window data available for display'}
          </div>
        )}
        
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
          {currentLocale === 'ar'
            ? 'تم تفعيل العرض ثنائي الأبعاد بسبب قيود الذاكرة'
            : '2D view enabled due to memory constraints'}
        </div>
      </CardContent>
    </Card>
  );
}

