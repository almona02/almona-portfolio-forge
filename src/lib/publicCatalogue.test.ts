import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { parsePublicCatalogue, readCatalogueBootstrap } from './publicCatalogue';

afterEach(() => { document.getElementById('almona-catalog-data')?.remove(); });

describe('public catalogue bootstrap', () => {
  it('accepts the shipped catalogue and rejects malformed rows', () => {
    const machines = JSON.parse(readFileSync('public/data/yilmazMachines.json', 'utf8'));
    expect(parsePublicCatalogue(machines)).toHaveLength(94);
    expect(parsePublicCatalogue([null])).toBeUndefined();
    expect(parsePublicCatalogue([{ id: 'x', name: 'Incomplete' }])).toBeUndefined();
  });
  it('reads a safe first-render snapshot and tolerates invalid bootstrap JSON', () => {
    const script = document.createElement('script');
    script.type = 'application/json'; script.id = 'almona-catalog-data';
    document.head.append(script);
    script.textContent = 'not json';
    expect(readCatalogueBootstrap()).toBeUndefined();
    script.textContent = readFileSync('public/data/yilmazMachines.json', 'utf8');
    expect(readCatalogueBootstrap()).toHaveLength(94);
  });
});
