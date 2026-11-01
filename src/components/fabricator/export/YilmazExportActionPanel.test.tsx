import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { YilmazExportActionPanel } from './YilmazExportActionPanel';

const runExport = vi.fn();
const downloadAll = vi.fn();

vi.mock('@/hooks/useYilmazExport', () => ({
  useYilmazExport: () => ({
    isReady: true,
    isExporting: false,
    machineModel: 'AIM-3410',
    format: 'all',
    setMachineModel: vi.fn(),
    setFormat: vi.fn(),
    availableModels: [{ model: 'AIM-3410', specs: { axes: 4 } }],
    runExport,
    downloadAll,
    error: null,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('YilmazExportActionPanel', () => {
  beforeEach(() => {
    runExport.mockReset();
    downloadAll.mockReset();
    runExport.mockResolvedValue({
      success: true,
      files: { gcode: {}, csv: {}, mdb: {}, manifest: {} },
      checksum: 'ABCD1234',
      metadata: {},
      validation: { valid: true, issues: [] },
    });
  });

  it('renders the operator Export to Yilmaz affordance', () => {
    render(
      <MemoryRouter>
        <YilmazExportActionPanel positionId="pose-1" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('yilmaz-export-action-panel')).toBeInTheDocument();
    expect(screen.getByTestId('yilmaz-export-button')).toHaveTextContent('Export to Yilmaz');
    expect(screen.getByRole('link', { name: /full export desk/i })).toHaveAttribute(
      'href',
      '/yilmaz-export'
    );
  });

  it('runs export then triggers downloads', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <YilmazExportActionPanel positionId="pose-1" />
      </MemoryRouter>
    );

    await user.click(screen.getByTestId('yilmaz-export-button'));

    expect(runExport).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(downloadAll).toHaveBeenCalledTimes(1);
    });
  });
});
