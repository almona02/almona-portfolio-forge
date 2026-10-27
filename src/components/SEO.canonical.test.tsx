import { readFileSync } from 'node:fs';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import SEO from './SEO';

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('link[rel="canonical"]').forEach(el => el.remove());
});

describe('canonical ownership', () => {
  it('marks missing pages as noindex while keeping normal pages indexable', async () => {
    const view = render(<HelmetProvider><SEO noindex /></HelmetProvider>);
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow'));
    view.rerender(<HelmetProvider><SEO /></HelmetProvider>);
    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow'));
  });
  it('replaces the shipped HTML fallback on route changes, leaving exactly one canonical', async () => {
    const source = readFileSync('index.html', 'utf8');
    const fallback = source.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0];
    expect(fallback).toContain('data-rh="true"');
    document.head.insertAdjacentHTML('beforeend', fallback!);
    const view = render(<HelmetProvider><SEO url="https://www.almona02.com/" /></HelmetProvider>);
    await waitFor(() => expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1));
    view.rerender(<HelmetProvider><SEO url="https://www.almona02.com/used-machines" /></HelmetProvider>);
    await waitFor(() => {
      const canonicals = document.head.querySelectorAll('link[rel="canonical"]');
      expect(canonicals).toHaveLength(1);
      expect(canonicals[0].getAttribute('href')).toBe('https://www.almona02.com/used-machines');
    });
  });
  it('uses the same canonical host in both languages of the static landing pages', () => {
    for (const page of ['dealer-verification', 'dealer-verification-en', 'fabricator-pro-software', 'fabricator-pro-software-en']) {
      const source = readFileSync('public/' + page + '.html', 'utf8');
      const document = new DOMParser().parseFromString(source, 'text/html');
      expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.almona02.com/' + page);
      for (const link of document.querySelectorAll('link[rel="alternate"][hreflang]')) {
        expect(new URL(link.getAttribute('href')!).origin).toBe('https://www.almona02.com');
      }
    }
  });
});
