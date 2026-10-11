/**
 * Built-in vendor catalogue packs for one-click admin approval.
 * Server RPC `_vendor_catalogue_pack_ids` / payload builder must stay aligned.
 */

export type VendorCataloguePack = {
  id: string;
  label: string;
  frameProfileId: string;
  sashProfileId: string;
  /** Extra profiles included in authority so design components can qualify. */
  extraProfiles?: ReadonlyArray<{ role: string; profileId: string }>;
};

export const VENDOR_CATALOGUE_PACKS: readonly VendorCataloguePack[] = [
  {
    id: 'caluminium-ps',
    label: 'CALUMINIUM PS',
    frameProfileId: 'PS-6601-FRAME',
    sashProfileId: 'PS-5600-SASH',
    extraProfiles: [
      { role: 'frame', profileId: 'PS-9601-FRAME' },
      { role: 'sash', profileId: 'PS-6601-SASH' },
      { role: 'interlock', profileId: 'PS-6601-INTERLOCK' },
      { role: 'track', profileId: 'PS-6601-TRACK' },
      { role: 'bead', profileId: 'PS-6601-BEAD' },
      { role: 'frame', profileId: 'PS-5600-FRAME' },
      { role: 'frame', profileId: 'PS-4800-FRAME' },
      { role: 'mullion', profileId: 'PS-101-MULLION' },
    ],
  },
  { id: 'panda-50', label: 'Panda 50', frameProfileId: 'P50-FRAME', sashProfileId: 'P50-SASH' },
  { id: 'panda-100', label: 'Panda 100', frameProfileId: 'P100-FRAME', sashProfileId: 'P100-SASH' },
  {
    id: 'wintech_6400_detailed',
    label: 'Wintech 6400',
    frameProfileId: 'WT6400-FRAME',
    sashProfileId: 'WT6400-SASH',
  },
  {
    id: 'kompen_60_eco',
    label: 'Kompen 60 Eco',
    frameProfileId: 'K60-FRAME',
    sashProfileId: 'K60-SASH',
  },
  {
    id: 'veka_70_softline',
    label: 'VEKA 70 Softline',
    frameProfileId: 'V70-FRAME',
    sashProfileId: 'V70-SASH',
  },
  {
    id: 'rehau_geneo',
    label: 'REHAU Geneo',
    frameProfileId: 'RG-FRAME',
    sashProfileId: 'RG-SASH',
  },
  {
    id: 'emapen_ema60_complete',
    label: 'Emapen EMA60',
    frameProfileId: 'EMA60-FRAME',
    sashProfileId: 'EMA60-SASH',
  },
  {
    id: 'emapen_ema60s_sliding',
    label: 'Emapen EMA60S Sliding',
    frameProfileId: 'EMA60S-FRAME',
    sashProfileId: 'EMA60S-SASH',
  },
] as const;

export function buildVendorAuthorityPayload(
  pack: VendorCataloguePack,
  approvalId: string,
  revision: number,
): Record<string, unknown> {
  const profileApproval = 'b1000000-0000-4000-8000-000000000001';
  const profiles = [
    {
      role: 'frame',
      profileId: pack.frameProfileId,
      stockLengthMm: 6000,
      evidenceStatus: 'approved',
      approvalId: profileApproval,
    },
    {
      role: 'sash',
      profileId: pack.sashProfileId,
      stockLengthMm: 6000,
      evidenceStatus: 'approved',
      approvalId: 'b1000000-0000-4000-8000-000000000002',
    },
    ...(pack.extraProfiles ?? []).map((p, i) => ({
      role: p.role,
      profileId: p.profileId,
      stockLengthMm: 6000,
      evidenceStatus: 'approved' as const,
      approvalId: `b1000000-0000-4000-8000-${String(i + 10).padStart(12, '0')}`,
    })),
  ];

  return {
    schema: 'almona.manufacturing-authority',
    schemaVersion: 1,
    system: { id: pack.id },
    systemPack: {
      id: pack.id,
      revision,
      evidenceStatus: 'approved',
      approvalId,
    },
    profiles,
    cuttingRules: [
      {
        ruleId: `${pack.id}-cut`,
        revision: 1,
        evidenceStatus: 'approved',
        approvalId: 'c1000000-0000-4000-8000-000000000001',
        deductions: { endDeductionMm: 20 },
        allowances: { weldMm: 3 },
        applicability: { materials: ['aluminum'] },
      },
    ],
    toleranceRule: {
      ruleId: `${pack.id}-tolerance`,
      revision: 1,
      evidenceStatus: 'approved',
      approvalId: 'c1000000-0000-4000-8000-000000000002',
    },
    manufacturingSettings: {
      sawKerfMm: 4,
      trimCutMm: 0,
    },
  };
}
