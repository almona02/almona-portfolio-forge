import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { it, expect } from 'vitest';
import { useWorkflowStore } from '@/store/workflowStore';
import { BOMReviewPanel } from './BOMReviewPanel';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { WindowUnit } from '@/types/fabricator';

it('opens position-specific prerequisites without marking an estimate complete', () => {
  useWorkflowStore.getState().clearWorkflow();
  useWorkflowStore.setState({ currentProject: { id: 'position-a', components: [] } as unknown as WindowUnit, bom: {
    profiles: [{ role: 'frame', quantity: 1, length: 1000 }], hardware: [], glazing: [], accessories: [], assemblySequence: [], confidence: 1,
    cost: { materialCost: 10, hardwareCost: 0, glazingCost: 0, accessoriesCost: 0, laborCost: 0, totalCost: 10 },
    metadata: { checksum: 'diagnostic', generationTimestamp: '2026-10-06', patternUsed: 'fixed', systemPackUsed: 'test' },
    qualification: { status: 'estimate', reasons: ['Approved cutting rules missing'] },
  } as unknown as CompleteBOM });
  render(<MemoryRouter initialEntries={['/projects/project-a/positions/position-a/bom']}><Routes>
    <Route path="/projects/:projectId/positions/:poseId/bom" element={<BOMReviewPanel />} />
    <Route path="/fabricator/studio/projects/project-a/positions/position-a/optimization" element={<p>Position-specific optimization prerequisites</p>} />
  </Routes></MemoryRouter>);
  expect(screen.getAllByText('Approved cutting rules missing')[0]).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Review optimization prerequisites' }));
  expect(screen.getByText('Position-specific optimization prerequisites')).toBeVisible();
  expect(useWorkflowStore.getState().completedSteps.has('bom')).toBe(false);
});
