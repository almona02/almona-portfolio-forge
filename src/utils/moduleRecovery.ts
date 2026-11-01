/** Browser download errors omit the HTTP status (including missing old chunks). */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading (?:css )?chunk .+ failed|chunkloaderror|unable to preload css/i.test(message);
}

/** Shared by startup and every route: at most one automatic reload per tab. */
export function claimModuleReload(): boolean {
  if (navigator.onLine === false) return false;
  try {
    const key = 'almona-module-reload';
    if (window.sessionStorage.getItem(key) === 'true') return false;
    window.sessionStorage.setItem(key, 'true');
    return window.sessionStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}
