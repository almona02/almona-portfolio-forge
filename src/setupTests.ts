import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Mock global objects that would normally be provided by the browser
if (typeof window === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  (global as typeof globalThis & { window: typeof window; document: typeof document; navigator: typeof navigator }).window = dom.window;
  (global as typeof globalThis & { window: typeof window; document: typeof document; navigator: typeof navigator }).document = dom.window.document;
  (global as typeof globalThis & { window: typeof window; document: typeof document; navigator: typeof navigator }).navigator = dom.window.navigator;
}

afterEach(() => {
  cleanup();
});

// Mock requestAnimationFrame for tests (required for animations and canvas operations)
global.requestAnimationFrame = (callback: FrameRequestCallback) => {
  return setTimeout(callback, 0) as unknown as number;
};

global.cancelAnimationFrame = (id: number) => {
  clearTimeout(id);
};

// Ensure React runs in test mode (not production) to avoid act() errors
if (typeof process !== 'undefined') {
  process.env.NODE_ENV = 'test';
}

// Provide a minimal jest compatibility shim for legacy tests using jest.* APIs
// Vitest exposes the same API surface under vi
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (!(global as typeof globalThis & { jest?: typeof vi }).jest) {
  (global as typeof globalThis & { jest?: typeof vi }).jest = vi as any;
}
