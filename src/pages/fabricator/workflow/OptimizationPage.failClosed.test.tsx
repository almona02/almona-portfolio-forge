import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { useWorkflowStore } from '@/store/workflowStore';
import type { OptimizationResult, WindowUnit } from '@/types/fabricator';

const mocks = vi.hoisted(() => ({ solve: vi.fn(), onComplete: undefined as undefined | (() => Promise<void>) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/algorithms/adaptiveSolver', () => ({ AdaptiveSolver: class { solve = mocks.solve; } }));
vi.mock('@/components/fabricator/cockpit/OptimizationCockpit', () => ({ OptimizationCockpit: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/fabricator/OptimizationEqualizer', () => ({ OptimizationEqualizer: ({ onComplete }: { onComplete: () => Promise<void> }) => { mocks.onComplete = onComplete; return <button onClick={() => void onComplete()}>Optimize</button>; } }));

import { OptimizationPage } from './OptimizationPage';

const pack = SYSTEM_PACKS.find(candidate => candidate.profiles?.length);
if (!pack) throw new Error('Test requires a system pack with profiles.');
const profile = pack.profiles[0];
const project = { id: 'position-1', updatedAt: new Date('2026-09-26'), systemPackId: pack.meta.id, components: [{ id: 'component-1', profile, quantity: 1, cuttingLengths: [1000] }] } as WindowUnit;
const result: OptimizationResult = { materialUsage: 1, wastePercentage: 0, estimatedProductionTime: 1, nestingEfficiency: 100, cuttingPlan: [{ profile, stockLength: 6000, totalWaste: 0, utilization: 100, cuts: [{ length: 1000, angle: 90, componentId: 'component-1', waste: 0 }] }], costBreakdown: { materialCost: 1, laborCost: 0, hardwareCost: 0, glazingCost: 0, totalCost: 1 } };

describe('OptimizationPage fail-closed execution', () => {
  beforeEach(() => {
    mocks.solve.mockReset();
    mocks.onComplete = undefined;
    useWorkflowStore.getState().clearWorkflow();
    useWorkflowStore.setState({ currentProject: project });
  });

  it('prevents duplicate submissions and ignores a late result after the position changes', async () => {
    let resolve!: (value: OptimizationResult) => void;
    mocks.solve.mockReturnValue(new Promise<OptimizationResult>(done => { resolve = done; }));
    render(<MemoryRouter><OptimizationPage /></MemoryRouter>);
    await waitFor(() => expect(mocks.onComplete).toBeDefined());

    let first!: Promise<void>;
    await act(async () => {
      first = mocks.onComplete!();
      void mocks.onComplete!();
      await Promise.resolve();
    });
    expect(mocks.solve).toHaveBeenCalledTimes(1);

    await act(() => { useWorkflowStore.setState({ currentProject: { ...project, id: 'position-2' } }); return Promise.resolve(); });
    await act(async () => { resolve(result); await first; });
    expect(useWorkflowStore.getState().optimizationResult).toBeNull();
    expect(useWorkflowStore.getState().completedSteps.has('optimization')).toBe(false);
  });
});
