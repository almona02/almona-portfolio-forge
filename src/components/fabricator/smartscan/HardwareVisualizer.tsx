import React from 'react';
import { EgyptianHardware } from '@/data/egyptian-hardware-database';
import type { ImportedProfile } from './DXFProfileImporter';

interface HardwareVisualizerProps {
  profile: ImportedProfile;
  hardware: EgyptianHardware[];
  validationResults: Record<string, any>;
}

export const HardwareVisualizer: React.FC<HardwareVisualizerProps> = ({
  profile,
  hardware,
  validationResults,
}) => {
  const svgContent = profile.svgPreview || generateSimpleProfileSVG(profile);

  return (
    <div className="border rounded bg-white p-4 relative">
      <div className="flex justify-between items-center mb-3">
        <h3 className="typography-h3 font-medium text-gray-800">Profile Cross-Section</h3>
        <div className="text-xs text-gray-500">
          {profile.widthMm || '?'} × {profile.heightMm || '?'} mm
        </div>
      </div>

      <div className="relative">
        <div
          className="dxf-preview"
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{ maxWidth: '100%', overflow: 'auto' }}
        />
        <div className="absolute inset-0 pointer-events-none">
          {hardware.map((hw, idx) => {
            const vr = validationResults[hw.id];
            const pos = calculateHardwarePosition(idx);
            return (
              <div
                key={hw.id}
                className={`absolute w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold ${
                  vr?.isValid ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'
                }`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={`${hw.name} • ${vr?.isValid ? 'Compatible' : 'Check'}`}
              >
                {idx + 1}
              </div>
            );
          })}
        </div>
      </div>

      {hardware.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {hardware.map((hw, idx) => {
            const vr = validationResults[hw.id];
            return (
              <div key={hw.id} className="flex items-center gap-2 p-2 border rounded">
                <div
                  className={`w-4 h-4 rounded-full border ${
                    vr?.isValid ? 'border-green-500 bg-green-100' : 'border-red-500 bg-red-100'
                  }`}
                />
                <div>
                  <div className="font-medium text-gray-800">
                    {idx + 1}. {hw.name}
                  </div>
                  <div className="text-gray-500">{hw.category.replace('_', ' ')}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const generateSimpleProfileSVG = (profile: ImportedProfile): string => {
  const width = profile.widthMm || 60;
  const height = profile.heightMm || 40;
  return `
    <svg width="400" height="200" viewBox="0 0 ${width + 20} ${height + 20}" style="background: #f8fafc">
      <rect x="10" y="10" width="${width}" height="${height}" fill="none" stroke="#64748b" stroke-width="2" rx="4" />
      <rect x="15" y="15" width="${width * 0.7}" height="${height * 0.6}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" />
      <text x="${width / 2 + 10}" y="${height + 25}" text-anchor="middle" font-size="10" fill="#64748b">
        ${width} × ${height}mm
      </text>
    </svg>
  `;
};

const calculateHardwarePosition = (index: number): { x: number; y: number } => {
  const positions = [
    { x: 25, y: 30 },
    { x: 75, y: 30 },
    { x: 25, y: 70 },
    { x: 75, y: 70 },
  ];
  return positions[index % positions.length];
};

