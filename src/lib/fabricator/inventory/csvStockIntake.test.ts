import { describe, expect, it } from 'vitest';
import { buildCsvIntakePreview, parseCsvText } from './csvStockIntake';

describe('csvStockIntake', () => {
  it('parses quoted fields containing commas', () => {
    const rows = parseCsvText(
      'profile_code,quantity,unit,supplier\nF60,10,bars,"Acme, Cairo"\n',
    );
    expect(rows[1][3]).toBe('Acme, Cairo');
  });

  it('rejects unknown units instead of treating them as bars', () => {
    const preview = buildCsvIntakePreview(
      'profile_code,quantity,unit,bar_length_m\nF60,10,kg,6\n',
      () => ({ id: 'p1', name: 'Frame', defaultBarLengthM: 6 }),
    );
    expect(preview.hasErrors).toBe(true);
    expect(preview.rows[0].errors.some((e) => /unsupported unit/i.test(e))).toBe(true);
    expect(preview.validRows).toHaveLength(0);
  });

  it('requires bar length for pieces and resolves profile', () => {
    const preview = buildCsvIntakePreview(
      'profile_code,quantity,unit,bar_length_m,invoice_no,supplier\nF60,10,pieces,6,INV-1,"Acme, Cairo"\n',
      (code) =>
        code === 'F60' ? { id: 'p1', name: 'Frame', defaultBarLengthM: 6 } : null,
    );
    expect(preview.hasErrors).toBe(false);
    expect(preview.validRows).toHaveLength(1);
    expect(preview.validRows[0].inputUnit).toBe('pieces');
    expect(preview.validRows[0].barLengthM).toBe(6);
    expect(preview.validRows[0].supplier).toBe('Acme, Cairo');
  });

  it('surfaces ambiguous catalogue codes', () => {
    const preview = buildCsvIntakePreview(
      'profile_code,quantity,unit\nF60,5,meters\n',
      () => 'ambiguous',
    );
    expect(preview.rows[0].errors.some((e) => /ambiguous/i.test(e))).toBe(true);
  });
});
