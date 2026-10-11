import { describe, expect, it } from 'vitest';
import type { FacadeModel, WindowUnit } from '@/types/fabricator';
import { FacadeReportService } from './FacadeReportService';

describe('lazy facade PDF export', () => {
  it('loads the table renderer and emits a real PDF document', async () => {
    const project = { orderNumber: 'PDF-TEST', customer: 'Test workshop' } as WindowUnit;
    const facade = { systemType: 'curtain_wall', totalArea: 2, members: [], panels: [] } as unknown as FacadeModel;
    const pdf = await FacadeReportService.generateFacadeReport(project, facade);
    expect(pdf.type).toBe('application/pdf');
    expect(pdf.size).toBeGreaterThan(1000);
  }, 15000);
});