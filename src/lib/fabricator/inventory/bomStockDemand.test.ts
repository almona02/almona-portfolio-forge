import { describe, expect, it } from 'vitest';
import type { FabricationData } from '@/types/fabricator';
import { bomStockDemand } from './bomStockDemand';
const id = 'a1000000-0000-4000-8000-0000000000a1';
const ledger = (cuts: number[]) => ({ id, cuttingLengths: cuts, quantity: 4 }) as FabricationData['profiles'][number];
describe('physical BOM stock demand', () => {
  it('sums expanded cut lengths once and combines repeated profile rows', () => {
    expect(bomStockDemand([ledger([1200, 1200, 1400, 1400]), ledger([800])])).toEqual({ [id]: 6 });
  });
  it('rejects unresolved catalog codes rather than dropping their demand', () => {
    expect(() => bomStockDemand([{ ...ledger([1000]), id: 'ROCK60-FRAME' }])).toThrow('owned inventory UUID');
  });
  it('rejects missing and non-finite cut ledgers', () => {
    expect(() => bomStockDemand([ledger([])])).toThrow();
    expect(() => bomStockDemand([ledger([NaN])])).toThrow();
  });
  it('uses the material profile UUID rather than the generated BOM row identity', () => {
    expect(bomStockDemand([{ ...ledger([1000]), id: 'frame-rock60', profileCode: id }])).toEqual({ [id]: 1 });
  });
});
