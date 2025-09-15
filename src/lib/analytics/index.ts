// Simple analytics abstraction. Supports optional PostHog (or other) injection.

export interface AnalyticsEventBase {
  event: string;
  properties?: Record<string, unknown>;
  ts?: number;
}

type AnalyticsSink = (payload: AnalyticsEventBase) => void;

const sinks: AnalyticsSink[] = [];
let initialized = false;

export const initAnalytics = (options?: { posthog?: { capture: (event: string, props?: Record<string, unknown>) => void } }) => {
  if (initialized) return;
  if (options?.posthog) {
    sinks.push(({ event, properties }) => {
      try { options.posthog!.capture(event, properties); } catch {/* ignore */}
    });
  }
  if (process.env.NODE_ENV !== 'production') {
    sinks.push(payload => { try { console.debug('[analytics-dev]', payload); } catch {/* ignore */} });
  }
  initialized = true;
};

export const track = (event: string, properties?: Record<string, unknown>) => {
  if (!initialized) initAnalytics();
  const payload: AnalyticsEventBase = { event, properties, ts: Date.now() };
  sinks.forEach(s => s(payload));
};

export const addSink = (sink: AnalyticsSink) => { sinks.push(sink); };
