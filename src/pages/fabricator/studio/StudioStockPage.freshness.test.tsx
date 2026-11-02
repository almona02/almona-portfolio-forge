/**
 * UI acceptance flow: acknowledgement must use a fresh authoritative snapshot.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { fingerprintBom } from '@/lib/fabricator/positionRelease';
import { useWorkflowStore } from '@/store/workflowStore';
import type { Profile } from '@/types/fabricator';

const mocks = vi.hoisted(() => ({
  loadInventory: vi.fn(),
  loadLots: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
vi.mock('@/context/FabricatorWorkspaceContext', () => ({
  useFabricatorWorkspace: () => ({ state: { currentProject: null } }),
}));
vi.mock('@/lib/fabricator/inventory/ProfileInventoryAdapter', () => ({
  loadOwnedWorkshopInventory: (...args: unknown[]) => mocks.loadInventory(...args),
}));
vi.mock('@/lib/fabricator/inventory/loadOwnedPhysicalBarLots', async () => {
  const actual = await vi.importActual<typeof import('@/lib/fabricator/inventory/loadOwnedPhysicalBarLots')>(
    '@/lib/fabricator/inventory/loadOwnedPhysicalBarLots',
  );
  return {
    ...actual,
    loadOwnedPhysicalBarLots: (...args: unknown[]) => mocks.loadLots(...args),
  };
});
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mocks.toastSuccess(...args),
    error: (...args: unknown[]) => mocks.toastError(...args),
    warning: (...args: unknown[]) => mocks.toastWarning(...args),
  },
}));
vi.mock('@/components/fabricator/PurchaseOrderDraftPanel', () => ({
  PurchaseOrderDraftPanel: () => null,
}));
vi.mock('@/components/fabricator/InventoryDashboard', () => ({
  InventoryDashboard: () => <div data-testid="inventory-dashboard" />,
}));

import { StudioStockPage } from './StudioStockPage';

const ownedId = 'a1000000-0000-4000-8000-0000000000a1';

const owned: Profile = {
  id: ownedId,
  name: 'Frame 60',
  material: 'aluminum',
  width: 60,
  color: '#fff',
  costPerMeter: 10,
  cuttingAllowance: 0,
  stockQuantity: 40,
  minStockLevel: 0,
  supplier: 'x',
  stockVersion: 1,
  specifications: {
    supplierCode: 'F60',
    systemPackId: 'rock60',
    stockLengthMm: 6000,
  },
} as Profile;

const identity = {
  ownerUserId: 'user-1',
  projectId: 'project-a',
  positionId: 'pose-1',
  source: 'v2' as const,
  revision: 9,
};

const bom = {
  profiles: [{
    id: 'bom-row-1',
    profileCode: ownedId,
    systemPack: 'rock60',
    cuttingLengths: [1500],
    cutIds: ['c:0'],
    angles: [90],
    length: 1500,
    quantity: 1,
  }],
  qualification: {
    status: 'qualified',
    identity: { ownerUserId: 'user-1' },
    catalogueVersion: 'fixture',
    ruleVersion: 'fixture',
    requiredPieceCount: 1,
    generatedPieceCount: 1,
    unplacedPieceCount: 0,
    reasons: [],
  },
} as unknown as CompleteBOM;

function inventoryOk(version = 1) {
  return {
    ok: true as const,
    profiles: [{ ...owned, stockVersion: version }],
    totalValue: 0,
    error: null,
  };
}

function lotsOk(version = 1) {
  return {
    ok: true as const,
    complete: true,
    error: null as string | null,
    lots: [{ ownedProfileId: ownedId, stockLengthMm: 6000, availableBars: 10, status: 'available' as const }],
    invalidatedProfileIds: [] as string[],
    stockVersionByProfile: { [ownedId]: version },
    stockVersionFingerprint: `${ownedId}:${version}`,
    movementCount: 0,
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StudioStockPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudioStockPage acknowledgement freshness', () => {
  beforeEach(() => {
    mocks.loadInventory.mockReset();
    mocks.loadLots.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.toastWarning.mockReset();
    useWorkflowStore.getState().clearWorkflow();
    useWorkflowStore.setState({
      bom,
      workflowIdentity: identity,
      stockReservation: null,
      currentProject: { id: 'pose-1', quantity: 1 } as never,
    });
  });

  it('acknowledges when the fresh snapshot matches the displayed fingerprint', async () => {
    mocks.loadInventory.mockResolvedValue(inventoryOk(1));
    mocks.loadLots.mockResolvedValue(lotsOk(1));
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /acknowledge/i })).toBeEnabled());
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
    });
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalled());
    const reservation = useWorkflowStore.getState().stockReservation;
    expect(reservation?.physicalStockVersionFingerprint).toBe(`${ownedId}:1`);
    expect(reservation?.physicalBarBinding).toBe('physical');
    expect(reservation?.bomFingerprint).toBe(fingerprintBom(bom));
    // Initial query + fresh ack load.
    expect(mocks.loadLots.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('blocks and refreshes when versions advance after page load', async () => {
    mocks.loadInventory
      .mockResolvedValueOnce(inventoryOk(1))
      .mockResolvedValue(inventoryOk(2));
    mocks.loadLots
      .mockResolvedValueOnce(lotsOk(1))
      .mockResolvedValue(lotsOk(2));
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /acknowledge/i })).toBeEnabled());
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
    });
    await waitFor(() => expect(mocks.toastWarning).toHaveBeenCalled());
    expect(mocks.toastWarning.mock.calls[0][0]).toMatch(/changed since this inventory view/i);
    expect(useWorkflowStore.getState().stockReservation).toBeNull();
  });

  it('blocks when the freshness query fails', async () => {
    mocks.loadInventory
      .mockResolvedValueOnce(inventoryOk(1))
      .mockResolvedValue({ ok: false, profiles: [], totalValue: 0, error: 'network down' });
    mocks.loadLots.mockResolvedValue(lotsOk(1));
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /acknowledge/i })).toBeEnabled());
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
    });
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
    expect(String(mocks.toastError.mock.calls[0][0])).toMatch(/network down|refresh owned inventory/i);
    expect(useWorkflowStore.getState().stockReservation).toBeNull();
  });
});
