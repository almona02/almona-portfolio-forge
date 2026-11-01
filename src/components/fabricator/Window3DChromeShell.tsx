import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  resolveViewportChromePolicy,
  VIEWPORT_CHROME_Z,
} from '@/lib/fabricator/layout/viewportChromePolicy';

/**
 * Non-overlapping chrome slots for the 3D viewport.
 * Toolbar / disclaimer / status are flex rows outside the panel column so they
 * never sit under an absolute Parts stack. Panels reserve width and leave a
 * usable canvas hit strip (minUsableCanvasPx).
 */
export function Window3DChromeShell({
  toolbar,
  disclaimer,
  partList,
  details,
  status,
  containerWidthPx = null,
  containerHeightPx = null,
}: {
  toolbar?: ReactNode;
  disclaimer?: ReactNode;
  partList?: ReactNode;
  details?: ReactNode;
  status?: ReactNode;
  containerWidthPx?: number | null;
  containerHeightPx?: number | null;
}) {
  const policy = resolveViewportChromePolicy({
    widthPx: containerWidthPx,
    heightPx: containerHeightPx,
    partsOpen: Boolean(partList),
    detailsOpen: Boolean(details),
    hasStatus: Boolean(status),
  });

  const showParts = policy.showParts && partList;
  const showDetails = policy.showDetails && details;
  const panelOpen = Boolean(showParts || showDetails);

  return (
    <div
      data-testid="window-3d-chrome"
      data-chrome-mode={policy.mode}
      data-panel-placement={policy.panelPlacement}
      data-inspection-mode={policy.inspectionMode}
      data-container-width={containerWidthPx ?? undefined}
      data-min-usable-canvas={policy.minUsableCanvasPx}
      className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-2 p-2"
      style={{ zIndex: VIEWPORT_CHROME_Z.controls }}
    >
      {toolbar ? (
        <div
          data-testid="window-3d-toolbar-slot"
          data-chrome-slot="controls"
          className="pointer-events-auto w-full shrink-0"
        >
          {toolbar}
        </div>
      ) : null}
      {disclaimer ? (
        <div
          data-testid="window-3d-disclaimer-slot"
          data-chrome-slot="controls"
          className="pointer-events-auto w-full max-w-xl shrink-0 self-start"
        >
          {disclaimer}
        </div>
      ) : null}

      {/* Middle: reserved panel column + canvas flex remainder (never covered by status). */}
      <div
        className="relative flex min-h-0 flex-1 gap-2"
        data-chrome-slot="panels"
        data-short-container={policy.shortContainer ? 'true' : undefined}
      >
        {panelOpen ? (
          <div
            data-testid="window-3d-panel-stack"
            data-chrome-stack={showParts && showDetails ? 'parts-details' : showParts ? 'parts' : 'details'}
            className={cn(
              'pointer-events-auto flex min-h-0 shrink-0 flex-col gap-2 overflow-hidden',
              policy.mode === 'compact' && 'max-w-full',
            )}
            style={{
              zIndex: VIEWPORT_CHROME_Z.panels,
              width: policy.panelMaxWidthPx,
              maxWidth: `calc(100% - ${policy.minUsableCanvasPx}px)`,
            }}
          >
            {showParts ? (
              <div
                data-testid="window-3d-part-list-slot"
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
              >
                {partList}
              </div>
            ) : null}
            {showDetails ? (
              <div
                data-testid="window-3d-details-slot"
                className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
              >
                {details}
              </div>
            ) : null}
            {policy.inspectionMode === 'exclusive-parts' && details ? (
              <p
                data-testid="window-3d-details-deferred"
                className="shrink-0 rounded border border-amber-500/40 bg-slate-950/90 px-2 py-1 text-[10px] text-amber-100"
              >
                Close Parts to inspect the selected part details in this narrow rail.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Usable canvas hit region — must remain pointer-events-none so clicks reach R3F canvas. */}
        <div
          data-testid="window-3d-canvas-hit"
          className="pointer-events-none min-h-[3rem] min-w-0 flex-1"
          style={{ minWidth: policy.minUsableCanvasPx }}
          aria-hidden
        />
      </div>

      {/* Status is a real flex row under panels — never absolute over the stack. */}
      {status ? (
        <div
          data-testid="window-3d-status-slot"
          data-chrome-slot="status"
          className="pointer-events-auto w-full shrink-0 overflow-x-auto"
          style={{
            zIndex: VIEWPORT_CHROME_Z.status,
            maxHeight: policy.shortContainer ? 56 : policy.statusRowPx,
          }}
        >
          {status}
        </div>
      ) : null}
    </div>
  );
}
