import { act, render, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { useWorkflowStore } from '@/store/workflowStore';
import type { OptimizationResult, WindowUnit } from '@/types/fabricator';

const mocks = vi.hoisted(() => ({ solve: vi.fn(), onComplete: undefined as undefined | (() => Promise<void>) }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/algorithms/adaptiveSolver', () => ({ AdaptiveSolver: class { solve = mocks.solve; } }));
vi.mock('@/components/fabricator/cockpit/OptimizationCockpit', () => ({ OptimizationCockpit: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/fabricator/OptimizationEqualizer', () => ({ OptimizationEqualizer: ({ onComplete }: { onComplete: () => Promise<void> }) => { mocks.onComplete = onComplete; return <button onClick={() => void onComplete()}>Optimize</button>; } }));

import { physicalCutForOccurrence } from '@/lib/fabricator/optimization/physicalCutContract';
import { OptimizationPage } from './OptimizationPage';

const pack = SYSTEM_PACKS.find(candidate => candidate.profiles?.length);
if (!pack) throw new Error('Test requires a system pack with profiles.');
const profile = pack.profiles[0];
const project = { id: 'position-1', updatedAt: new Date('2026-09-26'), systemPackId: pack.meta.id, components: [{ id: 'component-1', profile, quantity: 1, cuttingLengths: [1000] }] } as WindowUnit;
const result: OptimizationResult = { materialUsage: 1, wastePercentage: 0, estimatedProductionTime: 1, nestingEfficiency: 100, cuttingPlan: [{ profile, stockLength: 6000, totalWaste: 0, utilization: 100, cuts: [{ length: 1000, angle: 90, componentId: 'component-1', waste: 0 }] }], costBreakdown: { materialCost: 1, laborCost: 0, hardwareCost: 0, glazingCost: 0, totalCost: 1 } };
const qualifiedBom = {
  qualification: { status: 'qualified', identity: { ownerUserId: 'user-1' }, catalogueVersion: 'fixture-catalogue', ruleVersion: 'fixture-rules', requiredPieceCount: 1, generatedPieceCount: 1, unplacedPieceCount: 0, reasons: [] },
} as CompleteBOM;

describe('OptimizationPage fail-closed execution', () => {
  beforeEach(() => {
    mocks.solve.mockReset();
    mocks.onComplete = undefined;
    useWorkflowStore.getState().clearWorkflow();
    useWorkflowStore.setState({ currentProject: project, bom: qualifiedBom });
  });

  it('keeps a successful result available for PDF export instead of navigating away', async () => {
    const cut = physicalCutForOccurrence(project.components[0], 0, profile, project.systemPackId);
    const solved = { ...result, wastePercentage: (6000 - cut.length) / 6000 * 100, nestingEfficiency: cut.length / 6000 * 100,
      cuttingPlan: [{ profile, stockLength: 6000, totalWaste: 6000 - cut.length, utilization: cut.length / 6000 * 100, cuts: [cut] }] };
    mocks.solve.mockResolvedValue(solved);
    render(<MemoryRouter initialEntries={['/project/project-a/position/position-1']}><Routes>
      <Route path="/project/:projectId/position/:poseId" element={<OptimizationPage />} />
      <Route path="*" element={<p>Unexpected navigation</p>} />
    </Routes></MemoryRouter>);
    await waitFor(() => expect(mocks.onComplete).toBeDefined());
    await act(async () => { await mocks.onComplete!(); });
    expect(screen.getByRole('button', { name: 'Download cut-list PDF' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continue to Quote' })).toBeVisible();
    expect(screen.queryByText('Unexpected navigation')).toBeNull();
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
