import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DraftingPreview3D } from './DraftingPreview3D';

vi.mock('./DraftingContext', () => ({ useDraftingContext: () => ({ getGeometry: () => ({ rectangles: [{}] }) }) }));
vi.mock('./utils/draftingToWindowUnit', () => ({ draftingToWindowUnit: () => ({ id: 'pose', color: 'white', grid: { cells: [{}] }, previewLedgerBinding: 'no_authority', overallWidth: 1200, overallHeight: 1500 }) }));
vi.mock('./canvas/DraftingCanvas3D', () => ({ DraftingCanvas3D: () => null }));
vi.mock('./components/DraftingErrorBoundary', () => ({ DraftingErrorBoundary: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../Window3DGenerator', () => ({ Window3DGenerator: (props: { showControls: boolean; explodedView: boolean; setExplodedView: (value: boolean) => void; profiles: { id: string }[]; windowUnit: { color: string } }) => (
  <button onClick={() => props.setExplodedView(!props.explodedView)}>
    {`${props.showControls}:${props.explodedView}:${props.profiles[0].id}:${props.windowUnit.color}`}
  </button>
) }));

describe('drafting 3D controls', () => {
  it('passes profiles and finish, and allows returning from exploded to assembled', async () => {
    render(<DraftingPreview3D profiles={[{ id: 'PS-FRAME' }] as never} color="bronze" />);
    fireEvent.click(await screen.findByRole('button', { name: 'true:false:PS-FRAME:bronze' }));
    fireEvent.click(screen.getByRole('button', { name: 'true:true:PS-FRAME:bronze' }));
    expect(screen.getByRole('button', { name: 'true:false:PS-FRAME:bronze' })).toBeTruthy();
  });
});
