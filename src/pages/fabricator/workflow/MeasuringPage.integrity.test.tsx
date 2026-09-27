import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PoseLayoutPreview } from '@/components/fabricator/project/PoseLayoutPreview';
import type { MeasurementData, WindowUnit } from '@/types/fabricator';

import { nextPoseDraft, nextPoseNumber, unitFromMeasurement } from './MeasuringPage';

const pose = {
  id: 'position-1',
  projectId: 'project-1',
  posNumber: '7',
  overallWidth: 1210,
  overallHeight: 1550,
  grid: {
    rows: 1,
    cols: 2,
    cells: [
      { id: 'left', row: 0, col: 0, type: 'sliding' },
      { id: 'right', row: 0, col: 1, type: 'sliding' },
    ],
  },
  glazing: { type: 'single', color: 'bronze', thickness: 6 },
  components: [],
  hardware: [],
} as unknown as WindowUnit;

describe('Measuring pose integrity', () => {
  it('renders the authoritative per-pose grid and dimensions', () => {
    const { container } = render(
      <PoseLayoutPreview poses={[pose]} activeId={pose.id} compact />,
    );

    expect(screen.getByRole('img', {
      name: 'Pose 7: 1210 by 1550 millimetres, 2 columns by 1 rows',
    })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-cell-type="sliding"]')).toHaveLength(2);
  });

  it('preserves the saved grid while applying the current measurements', () => {
    const measurement = {
      width: '1220',
      height: '1560',
      manufacturingWidth: 1210,
      manufacturingHeight: 1550,
      windowType: 'sliding_window_2sash',
      glazingType: 'double',
      glassColor: 'clear',
      buildingBlock: 'B',
      unitOrApartment: '12',
      roomOrZone: 'Kitchen',
      windowIndex: 'W-07',
    } as MeasurementData;

    const result = unitFromMeasurement(pose, measurement, 'project-1', pose.id, '7');

    expect(result.overallWidth).toBe(1210);
    expect(result.overallHeight).toBe(1550);
    expect(result.grid).toEqual(pose.grid);
    expect(result.glazing).toMatchObject({ type: 'double', color: 'clear', thickness: 6 });
    expect(result.positionMeta).toMatchObject({
      buildingBlock: 'B',
      unitOrApartment: '12',
      roomOrZone: 'Kitchen',
      windowIndex: 'W-07',
    });
  });

  it('creates the next isolated measuring draft with a collision-free number', () => {
    const measurement = {
      width: '1210',
      height: '1550',
      manufacturingWidth: 1210,
      manufacturingHeight: 1550,
      windowType: 'sliding_window_2sash',
    } as MeasurementData;
    const number = nextPoseNumber([
      pose,
      { ...pose, id: 'position-2', posNumber: '9' },
    ]);
    const draft = nextPoseDraft(pose, measurement, 'project-1', 'position-3', number);

    expect(number).toBe('10');
    expect(draft).toMatchObject({
      id: 'position-3',
      projectId: 'project-1',
      posNumber: '10',
      status: 'measuring',
      overallWidth: 1210,
      overallHeight: 1550,
      grid: pose.grid,
      components: [],
      hardware: [],
      optimization: null,
    });
    expect(draft.positionMeta).toEqual({ buildingBlock: undefined });
  });
});
