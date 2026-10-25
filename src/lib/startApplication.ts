import { claimModuleReload, isChunkLoadError } from '../utils/moduleRecovery';

// Keep recovery outside React's dependency graph: a missing entry dependency
// otherwise prevents main.tsx and all of its error handlers from executing.
export async function startApplication(load: () => Promise<unknown>): Promise<void> {
  try {
    await load();
  } catch (error) {
    if (isChunkLoadError(error) && claimModuleReload()) {
      window.location.reload();
      return;
    }
    console.error('Application startup failed:', error);
    const root = document.getElementById('root');
    if (!root) return;
    const message = document.createElement('p');
    message.textContent = 'ALMONA is temporarily unable to load. Please check your connection and try again.';
    const retry = document.createElement('button');
    retry.textContent = 'Try again';
    retry.onclick = () => window.location.reload();
    root.replaceChildren(message, retry);
  }
}

