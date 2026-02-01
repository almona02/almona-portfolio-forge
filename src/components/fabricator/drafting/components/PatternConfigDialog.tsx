// src/components/fabricator/drafting/components/PatternConfigDialog.tsx

import { Button } from '@/shared/ui/ui/button';
import { X } from 'lucide-react';
import React, { useState } from 'react';
import type { Point } from '../types/drafting';
import type { PatternType } from '../utils/patternUtils';

interface PatternConfigDialogProps {
  patternType: PatternType;
  onApply: (config: any) => void;
  onCancel: () => void;
  basePoint?: Point;
}

export const PatternConfigDialog: React.FC<PatternConfigDialogProps> = ({
  patternType,
  onApply,
  onCancel,
  basePoint
}) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [rowSpacing, setRowSpacing] = useState(100);
  const [colSpacing, setColSpacing] = useState(100);
  const [radius, setRadius] = useState(200);
  const [count, setCount] = useState(8);
  const [startAngle, setStartAngle] = useState(0);
  const [offsetX, setOffsetX] = useState(200);
  const [offsetY, setOffsetY] = useState(150);

  const handleApply = () => {
    switch (patternType) {
      case 'rectangular':
        onApply({
          rows,
          cols,
          rowSpacing,
          colSpacing,
          basePoint
        });
        break;
      case 'circular':
        onApply({
          center: basePoint || { x: 500, y: 500 },
          radius,
          count,
          startAngle: (startAngle * Math.PI) / 180
        });
        break;
      case 'linear':
        // Linear array needs two points - will be handled in canvas
        onApply({
          count
        });
        break;
      case 'offset':
        onApply({
          offsetX,
          offsetY,
          count
        });
        break;
    }
  };

  const dialogRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (dialogRef.current) {
      // Focus trap for accessibility
      const firstInput = dialogRef.current.querySelector('input') as HTMLElement;
      firstInput?.focus();
    }
  }, []);
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pattern-dialog-title"
    >
      <div 
        ref={dialogRef}
        className="bg-slate-950 rounded-lg shadow-xl border border-amber-600/30 p-6 max-w-md w-full"
        role="document"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="pattern-dialog-title" className="text-lg font-semibold text-slate-100">
            {patternType === 'rectangular' && 'Rectangular Array'}
            {patternType === 'circular' && 'Circular Array'}
            {patternType === 'linear' && 'Linear Array'}
            {patternType === 'offset' && 'Offset Pattern'}
          </h3>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close dialog"
          >
            <X size={20} />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="space-y-4">
          {patternType === 'rectangular' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Rows
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-amber-600/30 rounded-md bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Columns
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={cols}
                  onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-amber-600/30 rounded-md bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Row Spacing (mm)
                </label>
                <input
                  type="number"
                  min="5"
                  value={rowSpacing}
                  onChange={(e) => setRowSpacing(parseFloat(e.target.value) || 5)}
                  className="w-full px-3 py-2 border border-amber-600/30 rounded-md bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Column Spacing (mm)
                </label>
                <input
                  type="number"
                  min="5"
                  value={colSpacing}
                  onChange={(e) => setColSpacing(parseFloat(e.target.value) || 5)}
                  className="w-full px-3 py-2 border border-amber-600/30 rounded-md bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </>
          )}

          {patternType === 'circular' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Radius (mm)
                </label>
                <input
                  type="number"
                  min="5"
                  value={radius}
                  onChange={(e) => setRadius(parseFloat(e.target.value) || 5)}
                  className="w-full px-3 py-2 border border-amber-600/30 rounded-md bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Count
                </label>
                <input
                  type="number"
                  min="2"
                  max="1000"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 2)}
                  className="w-full px-3 py-2 border border-amber-600/30 rounded-md bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Start Angle (degrees)
                </label>
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={startAngle}
                  onChange={(e) => setStartAngle(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-amber-600/30 rounded-md bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </>
          )}

          {patternType === 'linear' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Count
              </label>
              <input
                type="number"
                min="2"
                max="1000"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 2)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Click start point, then end point on canvas
              </p>
            </div>
          )}

          {patternType === 'offset' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Offset X (mm)
                </label>
                <input
                  type="number"
                  value={offsetX}
                  onChange={(e) => setOffsetX(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-amber-600/30 rounded-md bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Offset Y (mm)
                </label>
                <input
                  type="number"
                  value={offsetY}
                  onChange={(e) => setOffsetY(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-amber-600/30 rounded-md bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">
                  Count
                </label>
                <input
                  type="number"
                  min="2"
                  max="1000"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 2)}
                  className="w-full px-3 py-2 border border-amber-600/30 rounded-md bg-slate-900/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleApply}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Apply
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-amber-600/30 text-slate-200 hover:bg-slate-800/50 hover:text-amber-300"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

