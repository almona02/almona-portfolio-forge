import React from 'react';

interface IstanbulSkylineFooterProps {
  /** 0–1 completion ratio across the main workflow steps. */
  completionRatio: number;
}

export const IstanbulSkylineFooter: React.FC<IstanbulSkylineFooterProps> = ({
  completionRatio,
}) => {
  const clamped = Math.max(0, Math.min(1, completionRatio || 0));

  const totalWindows = 18;
  const litWindows = Math.round(totalWindows * clamped);

  return (
    <div className="mt-10 rounded-t-2xl border-t border-slate-800 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-900/80 px-4 py-5">
      <div className="mx-auto flex max-w-5xl flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Istanbul Skyline – lights react as you progress from Measuring to Quality.</span>
          <span className="font-medium text-amber-300">
            {Math.round(clamped * 100)}
            % journey complete
          </span>
        </div>

        {/* Stylised skyline – simple, fast SVG tailored to dark backgrounds */}
        <svg
          viewBox="0 0 400 80"
          className="mt-1 h-16 w-full text-slate-700"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="skylineGlow" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="50%" stopColor="#020617" />
              <stop offset="100%" stopColor="#082f49" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="400" height="80" fill="url(#skylineGlow)" />

          {/* Water line */}
          <rect x="0" y="62" width="400" height="3" fill="#020617" opacity={0.9} />

          {/* Simple bridge deck */}
          <path
            d="M10 55 Q 200 40 390 55"
            fill="none"
            stroke="#0ea5e9"
            strokeWidth={1.5}
            strokeOpacity={0.6 + clamped * 0.3}
          />

          {/* Towers */}
          <g stroke="#020617" strokeWidth="1">
            <rect x="40" y="30" width="12" height="32" fill="#020617" />
            <rect x="120" y="26" width="14" height="36" fill="#020617" />
            <rect x="190" y="18" width="18" height="44" fill="#020617" />
            <rect x="260" y="24" width="14" height="38" fill="#020617" />
            <rect x="330" y="28" width="12" height="34" fill="#020617" />
          </g>

          {/* Windows – lit based on progression */}
          {Array.from({ length: totalWindows }).map((_, index) => {
            const lit = index < litWindows;
            const baseFill = lit ? '#fbbf24' : '#020617';
            const glow = lit ? 0.9 : 0.4;

            const column = index % 6;
            const row = Math.floor(index / 6);

            const baseX = 52 + column * 48;
            const baseY = 32 + row * 9;

            return (
              <rect
                key={index}
                x={baseX}
                y={baseY}
                width="4"
                height="6"
                fill={baseFill}
                opacity={glow}
                rx="0.5"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default IstanbulSkylineFooter;


