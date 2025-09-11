import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Mock global objects that would normally be provided by the browser
if (typeof window === 'undefined') {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
}

afterEach(() => {
  cleanup();
});

// Provide a minimal jest compatibility shim for legacy tests using jest.* APIs
// Vitest exposes the same API surface under vi
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (!(global as any).jest) {
  (global as any).jest = vi;
}
