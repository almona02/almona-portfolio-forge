import React from 'react';

/**
 * Non-overlapping chrome slots for the 3D viewport.
 * Toolbar and disclaimer sit in a top column; Parts docks in the remaining left band.
 */
export function Window3DChromeShell({
  toolbar,
  disclaimer,
  partList,
  status,
}: {
  toolbar?: React.ReactNode;
  disclaimer?: React.ReactNode;
  partList?: React.ReactNode;
  status?: React.ReactNode;
}) {
  return (
    <div
      data-testid="window-3d-chrome"
      className="pointer-events-none absolute inset-0 z-10 flex flex-col gap-2 p-2"
    >
      {toolbar ? (
        <div data-testid="window-3d-toolbar-slot" className="pointer-events-auto w-full shrink-0">
          {toolbar}
        </div>
      ) : null}
      {disclaimer ? (
        <div data-testid="window-3d-disclaimer-slot" className="pointer-events-auto w-full max-w-xl shrink-0 self-start">
          {disclaimer}
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1">
        {partList ? (
          <div
            data-testid="window-3d-part-list-slot"
            className="pointer-events-auto absolute inset-y-0 left-0 z-20 w-[min(20rem,calc(100%-0.5rem))]"
          >
            {partList}
          </div>
        ) : null}
        {status ? (
          <div
            data-testid="window-3d-status-slot"
            className={`pointer-events-auto absolute bottom-0 z-10 ${partList ? 'right-0' : 'left-0'}`}
          >
            {status}
          </div>
        ) : null}
      </div>
    </div>
  );
}
