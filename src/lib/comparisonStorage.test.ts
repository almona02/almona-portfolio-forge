import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadComparisons } from './comparisonStorage';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('public catalogue comparison recovery', () => {
  it('does not throw or delete malformed saved JSON', () => {
    localStorage.setItem('saved_comparisons', '{broken-json');
    expect(loadComparisons()).toEqual([]);
    expect(localStorage.getItem('saved_comparisons')).toBe('{broken-json');
  });
  it('rejects invalid comparison shapes', () => {
    localStorage.setItem('saved_comparisons', '[null,{},[null],[{"id":"ym-001","name":"ALM 6510"}]]');
    expect(loadComparisons()).toEqual([[{ id: 'ym-001', name: 'ALM 6510' }]]);
  });
  it('keeps the page usable when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    expect(loadComparisons()).toEqual([]);
  });
});
