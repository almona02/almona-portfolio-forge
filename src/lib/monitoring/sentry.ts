/**
 * Sentry Error Tracking Integration
 * Captures and reports unhandled exceptions and errors
 */

// Dynamic import for Sentry (optional dependency)
let Sentry: any = null;

async function loadSentry() {
  if (Sentry) return Sentry;
  try {
    // @ts-expect-error - @sentry/react may not be installed
    Sentry = await import('@sentry/react');
    return Sentry;
  } catch {
    console.warn('@sentry/react not installed. Error tracking disabled.');
    return null;
  }
}

let isInitialized = false;

export async function initSentry() {
  if (isInitialized) return;

  const sentryModule = await loadSentry();
  if (!sentryModule) {
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  sentryModule.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Filter out common non-critical errors
    beforeSend(event, hint) {
      // Filter out network errors that are expected
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          return null; // Don't report network failures
        }
      }
      return event;
    },
  });

  Sentry = sentryModule;
  isInitialized = true;
  console.log('Sentry initialized for error tracking');
}

export { Sentry };

