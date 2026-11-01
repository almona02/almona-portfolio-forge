import { describe, expect, it } from 'vitest';
import type { BomDemandReport } from './bomStockAvailability';
import {
  buildFreshStockAcknowledgement,
  decideProductionStockFreshness,
  decideStockAcknowledgementFreshness,
} from './stockAcknowledgementFreshness';
import type { WorkflowIdentity } from '@/store/workflowStore';

const identity: WorkflowIdentity = {
  ownerUserId: 'owner',
  projectId: 'project',
  positionId: 'pose',
  source: 'v2',
  revision: 9,
};

const report = (versions: Record<string, number> = { 'owned-1': 1 }): BomDemandReport => ({
  rows: [{
    bomRowId: 'bom-1',
    catalogueCode: 'F60',
    pack: 'pack',
    material: 'aluminum',
    finish: '',
    requiredMetres: 3,
    ownedProfileId: 'owned-1',
    ownedProfileName: 'F60',
    availableMetres: 40,
    shortageMetres: 0,
    mappingStatus: 'mapped',
    eligibleBarLengthsM: [6],
    isTestStock: false,
  }],
  missingMappingCount: 0,
  shortageCount: 0,
  allMapped: true,
  availabilityOk: true,
  totalRequiredMetres: 3,
  stockVersionByProfile: versions,
});

describe('decideStockAcknowledgementFreshness', () => {
  it('accepts when fresh snapshot matches the displayed fingerprint', () => {
    expect(decideStockAcknowledgementFreshness({
      displayedFingerprint: 'owned-1:1',
      freshOk: true,
      freshComplete: true,
      freshFingerprint: 'owned-1:1',
    })).toEqual({ ok: true, action: 'accept' });
  });

  it('blocks refresh when version advances after page load', () => {
    const d = decideStockAcknowledgementFreshness({
      displayedFingerprint: 'owned-1:1',
      freshOk: true,
      freshComplete: true,
      freshFingerprint: 'owned-1:2',
    });
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.action).toBe('block_refresh');
  });

  it('blocks on freshness query failure / incomplete snapshot', () => {
    const d = decideStockAcknowledgementFreshness({
      displayedFingerprint: 'owned-1:1',
      freshOk: false,
      freshComplete: false,
      freshFingerprint: '',
      freshError: 'network down',
    });
    expect(d).toMatchObject({ ok: false, action: 'block_error', reason: 'network down' });
  });
});

describe('decideProductionStockFreshness', () => {
  it('accepts when live versions match acknowledgement fingerprint', () => {
    expect(decideProductionStockFreshness({
      acknowledgementFingerprint: 'owned-1:1',
      currentVersions: { 'owned-1': 1 },
    })).toEqual({ ok: true, action: 'accept' });
  });

  it('blocks when versions advance after acknowledgement', () => {
    const d = decideProductionStockFreshness({
      acknowledgementFingerprint: 'owned-1:1',
      currentVersions: { 'owned-1': 2 },
    });
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.action).toBe('block_refresh');
  });

  it('blocks when live version query fails', () => {
    const d = decideProductionStockFreshness({
      acknowledgementFingerprint: 'owned-1:1',
      currentVersions: null,
      currentVersionsError: 'timeout',
    });
    expect(d).toMatchObject({ ok: false, action: 'block_error', reason: 'timeout' });
  });
});

describe('buildFreshStockAcknowledgement', () => {
  it('stamps reservation from fresh lots/versions only', () => {
    const built = buildFreshStockAcknowledgement({
      identity,
      bomFingerprint: 'bom-fp',
      report: report({ 'owned-1': 5 }),
      freshLots: [{ ownedProfileId: 'owned-1', stockLengthMm: 6000, availableBars: 10, status: 'available' }],
      freshInvalidatedProfileIds: [],
      freshStockVersionByProfile: { 'owned-1': 5 },
      freshFingerprint: 'owned-1:5',
      ownedProfiles: [],
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.reservation.physicalStockVersionFingerprint).toBe('owned-1:5');
    expect(built.reservation.stockVersionByProfile).toEqual({ 'owned-1': 5 });
    expect(built.reservation.barsByCatalogueLength?.['owned-1|6000']).toBe(10);
    expect(built.reservation.physicalBarBinding).toBe('physical');
  });

  it('refuses when fingerprint does not match the version map', () => {
    const built = buildFreshStockAcknowledgement({
      identity,
      bomFingerprint: 'bom-fp',
      report: report(),
      freshLots: [],
      freshInvalidatedProfileIds: [],
      freshStockVersionByProfile: { 'owned-1': 1 },
      freshFingerprint: 'owned-1:99',
      ownedProfiles: [],
    });
    expect(built.ok).toBe(false);
  });
});
