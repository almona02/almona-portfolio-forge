import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WindowGrid } from '@/types/fabricator';

export interface SchematicIconHandle {
  capture: () => Promise<string>; // Base64 PNG
}

interface SchematicProps {
  topology: WindowGrid;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Lightweight, dependency-free SVG renderer for window topology.
 * Acts as the fail-safe thumbnail generator for PDFs/quotes.
 */
export const SchematicIconGenerator = forwardRef<SchematicIconHandle, SchematicProps>(
  ({ topology, width = 200, height = 200, className }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);

    // Capture the current SVG as a 2x PNG data URL for crisp PDF output.
    useImperativeHandle(ref, () => ({
      capture: async () => {
        if (!svgRef.current) return '';
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgRef.current);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        return new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width * 2;
            canvas.height = height * 2;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.scale(2, 2);
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/png'));
            } else {
              resolve('');
            }
            URL.revokeObjectURL(url);
          };
          img.src = url;
        });
      },
    }));

    const cellWidth = width / topology.cols;
    const cellHeight = height / topology.rows;
    const strokeWidth = 2;

    const getCellIndicator = (type: string) => {
      if (type === 'sash') {
        return (
          <path
            d={`M0,0 L${cellWidth},${cellHeight / 2} L0,${cellHeight}`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        );
      }
      if (type === 'sliding') {
        return (
          <path
            d={`M${cellWidth * 0.2},${cellHeight / 2} H${cellWidth * 0.8} M${cellWidth * 0.6},${
              cellHeight * 0.3
            } L${cellWidth * 0.8},${cellHeight * 0.5} L${cellWidth * 0.6},${cellHeight * 0.7}`}
            fill="none"
            stroke="#000"
            strokeWidth={1.5}
          />
        );
      }
      if (type === 'fixed') {
        return (
          <path
            d={`M${cellWidth * 0.7},${cellHeight * 0.1} L${cellWidth * 0.9},${cellHeight * 0.3}`}
            stroke="#cbd5e1"
            strokeWidth={2}
          />
        );
      }
      return null;
    };

    return (
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
        className={`bg-white ${className || ''}`}
      >
        {/* Outer frame */}
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={width - strokeWidth}
          height={height - strokeWidth}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth * 2}
        />

        {/* Cells */}
        {topology.cells.map((cell) => {
          const x = cell.col * cellWidth;
          const y = cell.row * cellHeight;
          return (
            <g key={cell.id} transform={`translate(${x}, ${y})`}>
              <rect
                x={0}
                y={0}
                width={cellWidth}
                height={cellHeight}
                fill="#f1f5f9"
                stroke="#475569"
                strokeWidth={strokeWidth}
              />
              {getCellIndicator(cell.type)}
            </g>
          );
        })}
      </svg>
    );
  }
);

SchematicIconGenerator.displayName = 'SchematicIconGenerator';

