/**
 * Lane B pin-contract acceptance guard (Spark independent verification).
 *
 * Binds the reviewed contract bytes at feat/service-routines-authoring tip
 * da4bcb4a (SHA-256 806f90bd…, LF-normalized) and the frozen acceptance
 * clauses the implementation battery (RB-01..RB-20, LB-C1) executes against.
 * Update the pinned hash only alongside an explicit Spark contract re-review.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const CONTRACT_PATH =
  'docs/operations/service-workflow/SERVICE_ROUTINES_LANE_B_PIN_CONTRACT.md';
// Accepted contract bytes at da4bcb4a, LF-normalized: checkout line endings vary.
const ACCEPTED_SHA256 =
  '806f90bd8e5cb59071153f414c1c2d917a2c9e2d9592c326dc465b6d4db9e2ed';

const FROZEN_DETAILS = [
  'routine_pin_version_not_published',
  'routine_pin_version_retired',
  'routine_pin_machine_unlinked',
  'routine_pin_machine_uncatalogued',
  'routine_pin_applicability_denied',
  'routine_pin_reason_required',
  'routine_pin_cardinality',
  'routine_pin_locked_after_start',
  'routine_job_pin_authz_denied',
];

function contractText(): string {
  return readFileSync(resolve(process.cwd(), CONTRACT_PATH), 'utf8').replace(
    /\r\n/g,
    '\n',
  );
}

describe('Lane B pin contract acceptance binding', () => {
  test('contract bytes match the Spark-reviewed tip', () => {
    const digest = createHash('sha256')
      .update(contractText(), 'utf8')
      .digest('hex');
    expect(digest).toBe(ACCEPTED_SHA256);
  });

  test('frozen error DETAILs are present', () => {
    const text = contractText();
    for (const detail of FROZEN_DETAILS) {
      expect(text).toContain(detail);
    }
  });

  test('RB-01..RB-20 matrix rows are present', () => {
    const text = contractText();
    for (let n = 1; n <= 20; n += 1) {
      expect(text).toContain(`RB-${String(n).padStart(2, '0')}`);
    }
  });

  test('no 40001-class error is prescribed for pin conflicts', () => {
    expect(contractText()).not.toContain('40001');
  });
});

describe('Lane B LB-C1 concurrency requirement (retained separately)', () => {
  test('exactly-one-active under concurrent replaces is required', () => {
    const text = contractText();
    expect(text).toContain('Concurrent replaces');
    expect(text).toContain('Exactly one `active` pin per job');
  });
});
