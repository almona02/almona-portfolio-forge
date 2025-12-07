import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export interface ProfileIconHandle {
  capture: () => Promise<string>;
}

interface ProfileIconProps {
  widthMm: number;
  heightMm?: number;
  wallThicknessMm?: number;
  glazingPocketDepthMm?: number;
  glazingPocketWidthMm?: number;
  flangeWidthMm?: number;
  className?: string;
  color?: string;
}

/**
 * Simple parametric SVG renderer for profile cross-sections.
 * Uses mm-scale coordinates for ease of mapping to real dimensions.
 */
export const ProfileIconGenerator = forwardRef<ProfileIconHandle, ProfileIconProps>(
  (
    {
      widthMm,
      heightMm,
      wallThicknessMm = 1.5,
      glazingPocketDepthMm = 0,
      glazingPocketWidthMm = 0,
      flangeWidthMm = 0,
      className,
      color = '#9ca3af', // slate-400
    },
    ref
  ) => {
    const svgRef = useRef<SVGSVGElement>(null);

    const w = Math.max(widthMm, 1);
    const h = Math.max(heightMm || widthMm, 1);
    const t = Math.max(wallThicknessMm, 0.5);
    const innerW = Math.max(w - 2 * t, 0);
    const innerH = Math.max(h - 2 * t, 0);

    const hasPocket = glazingPocketDepthMm > 0 && glazingPocketWidthMm > 0;
    const pocketDepth = Math.min(glazingPocketDepthMm, innerH);
    const pocketWidth = Math.min(glazingPocketWidthMm, innerW);

    // Capture the SVG as 2x PNG
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
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Fit SVG into canvas
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label="Profile cross-section"
      >
        {/* Outer shape */}
        <rect x={0} y={0} width={w} height={h} fill={color} rx={t * 0.3} />

        {/* Hollow core */}
        <rect x={t} y={t} width={innerW} height={innerH} fill="white" rx={t * 0.15} />

        {/* Glazing pocket notch */}
        {hasPocket && (
          <rect
            x={w - t - pocketWidth}
            y={t}
            width={pocketWidth}
            height={pocketDepth}
            fill="#e5e7eb"
          />
        )}

        {/* Flange (for Z/T shapes) */}
        {flangeWidthMm > 0 && (
          <rect
            x={-flangeWidthMm}
            y={h * 0.35}
            width={flangeWidthMm}
            height={h * 0.3}
            fill={color}
          />
        )}
      </svg>
    );
  }
);

ProfileIconGenerator.displayName = 'ProfileIconGenerator';

