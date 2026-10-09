/**
 * DEV-only harness for phone measuring UX (pack / pattern / Confirm → Design).
 * Route: /dev/measuring-mobile — not shipped in production builds.
 * Fixed full-viewport shell so site chrome does not steal measuring height.
 */
import { SmartMeasuringInterface } from '@/components/fabricator/SmartMeasuringInterface';
import type { MeasurementData } from '@/types/fabricator';
import { useEffect, useState } from 'react';

export default function MeasuringMobilePreview() {
  const [last, setLast] = useState<MeasurementData | null>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-measuring-mobile-preview', '1');
    style.textContent = `
      .performance-dashboard,
      .performance-dashboard-toggle { display: none !important; }
    `;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 text-amber-100 flex justify-center">
      <div className="h-full w-full max-w-md flex flex-col border-x border-amber-600/20">
        <div className="shrink-0 px-3 py-2 border-b border-amber-600/25 text-xs text-slate-400">
          DEV mobile measuring preview
          {last ? (
            <span className="ml-2 text-emerald-400" data-testid="measuring-mobile-saved">
              Saved {last.width}×{last.height} → Design/BOM
            </span>
          ) : null}
        </div>
        <div className="flex-1 min-h-0">
          <SmartMeasuringInterface
            systemPackId="caluminium-ps"
            poseLabel="Pose 1"
            initialData={{
              width: '1200',
              height: '1400',
              windowType: 'sliding_window_2sash',
              glazingType: 'single',
              color: 'White',
              measurementMode: 'manufacturing',
              wallDeduction: '0',
              systemPackId: 'caluminium-ps',
            }}
            onMeasurementComplete={(data) => setLast(data)}
            onSaveAndNextPose={(data) => setLast(data)}
          />
        </div>
      </div>
    </div>
  );
}
