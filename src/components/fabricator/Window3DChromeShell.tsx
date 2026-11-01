import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  resolveViewportChromePolicy,
  VIEWPORT_CHROME_Z,
} from '@/lib/fabricator/layout/viewportChromePolicy';

/**
 * Non-overlapping chrome slots for the 3D viewport.
 * Toolbar and disclaimer sit in a top column; Parts / details dock by container policy.
 * At ~380px (Engineering Bay rail), Parts + details stack — never two overlapping absolute cards.
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
  /** Selected-part details — stacked with Parts under compact container width. */
  details?: ReactNode;
  status?: ReactNode;
  /** Measured content-box width of the 3D host. Null = unmeasured. */
  containerWidthPx?: number | null;
  containerHeightPx?: number | null;
}) {
  const partsOpen = Boolean(partList);
  const detailsOpen = Boolean(details);
  const policy = resolveViewportChromePolicy({
    widthPx: containerWidthPx,
    heightPx: containerHeightPx,
    partsOpen,
    detailsOpen,
  });

  const stack = policy.stackPartsAndDetails && (partsOpen || detailsOpen);

  return (
    <div
      data-testid="window-3d-chrome"
      data-chrome-mode={policy.mode}
      data-panel-placement={policy.panelPlacement}
      data-container-width={containerWidthPx ?? undefined}
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
      <div className="relative min-h-0 flex-1" data-chrome-slot="panels">
        {stack ? (
          <div
            data-testid="window-3d-panel-stack"
            data-chrome-stack="parts-details"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 z-20 flex max-h-full flex-col gap-2',
              policy.mode === 'compact'
                ? 'w-[min(100%,calc(100%-0.25rem))]'
                : 'w-[min(20rem,calc(100%-0.5rem))]',
            )}
            style={{ zIndex: VIEWPORT_CHROME_Z.panels }}
          >
            {partList ? (
              <div
                data-testid="window-3d-part-list-slot"
                className="pointer-events-auto min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
              >
                {partList}
              </div>
            ) : null}
            {details ? (
              <div
                data-testid="window-3d-details-slot"
                className="pointer-events-auto min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
              >
                {details}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {partList ? (
              <div
                data-testid="window-3d-part-list-slot"
                className="pointer-events-auto absolute inset-y-0 left-0 z-20 w-[min(20rem,calc(100%-0.5rem))] overflow-y-auto overflow-x-hidden"
                style={{ zIndex: VIEWPORT_CHROME_Z.panels }}
              >
                {partList}
              </div>
            ) : null}
            {details ? (
              <div
                data-testid="window-3d-details-slot"
                className={cn(
                  'pointer-events-auto absolute z-20 overflow-y-auto overflow-x-hidden',
                  partList
                    ? 'inset-y-0 left-[min(20rem,calc(100%-0.5rem))] ml-2 w-[min(18rem,calc(100%-20.5rem))]'
                    : 'bottom-0 right-0 max-h-[min(60%,20rem)] w-[min(22rem,calc(100%-0.5rem))]',
                )}
                style={{ zIndex: VIEWPORT_CHROME_Z.panels }}
              >
                {details}
              </div>
            ) : null}
          </>
        )}
        {status ? (
          <div
            data-testid="window-3d-status-slot"
            data-chrome-slot="status"
            className={cn(
              'pointer-events-auto absolute bottom-0 z-10 max-w-[min(20rem,calc(100%-0.5rem))]',
              partList || stack ? 'right-0' : 'left-0',
            )}
            style={{ zIndex: VIEWPORT_CHROME_Z.status }}
          >
            {status}
          </div>
        ) : null}
      </div>
    </div>
  );
}
