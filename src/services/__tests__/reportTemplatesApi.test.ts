/**
 * Report Templates API Tests
 * 
 * Phase 4 Testing - Report Templates API service unit tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    listReportTemplates,
    getReportTemplate,
    createReportTemplate,
    updateReportTemplate,
    deleteReportTemplate,
    type ReportTemplateResponse,
    type ReportTemplateCreateRequest,
    type ReportTemplateUpdateRequest,
} from '../reportTemplatesApi';

// Mock fetch
global.fetch = vi.fn();

// Mock supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({
                data: {
                    session: {
                        access_token: 'test-token',
                    },
                },
            }),
        },
    },
}));

describe('Report Templates API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockClear();
    });

    describe('listReportTemplates', () => {
        it('should fetch report templates successfully', async () => {
            const mockResponse: { templates: ReportTemplateResponse[]; total: number } = {
                templates: [
                    {
                        id: '1',
                        name: 'Test Template',
                        description: 'Test',
                        category: 'revenue',
                        template_schema: {},
                        is_public: false,
                        user_id: 'user-1',
                        created_at: '2026-01-01T00:00:00Z',
                        updated_at: '2026-01-01T00:00:00Z',
                    },
                ],
                total: 1,
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await listReportTemplates();

            expect(result).toEqual(mockResponse);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v2/report-templates'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        Authorization: expect.stringContaining('Bearer'),
                    }),
                })
            );
        });

        it('should handle errors', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ detail: 'Internal server error' }),
            });

            await expect(listReportTemplates()).rejects.toThrow();
        });
    });

    describe('getReportTemplate', () => {
        it('should fetch a single template', async () => {
            const mockTemplate: ReportTemplateResponse = {
                id: '1',
                name: 'Test Template',
                description: 'Test',
                category: 'revenue',
                template_schema: {},
                is_public: false,
                user_id: 'user-1',
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTemplate),
            });

            const result = await getReportTemplate('1');

            expect(result).toEqual(mockTemplate);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v2/report-templates/1'),
                expect.objectContaining({
                    method: 'GET',
                })
            );
        });
    });

    describe('createReportTemplate', () => {
        it('should create a template', async () => {
            const createRequest: ReportTemplateCreateRequest = {
                name: 'New Template',
                description: 'New',
                category: 'revenue',
                template_schema: {},
                is_public: false,
            };

            const mockTemplate: ReportTemplateResponse = {
                id: '2',
                ...createRequest,
                user_id: 'user-1',
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTemplate),
            });

            const result = await createReportTemplate(createRequest);

            expect(result).toEqual(mockTemplate);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v2/report-templates'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(createRequest),
                })
            );
        });
    });

    describe('updateReportTemplate', () => {
        it('should update a template', async () => {
            const updateRequest: ReportTemplateUpdateRequest = {
                name: 'Updated Template',
            };

            const mockTemplate: ReportTemplateResponse = {
                id: '1',
                name: 'Updated Template',
                description: 'Test',
                category: 'revenue',
                template_schema: {},
                is_public: false,
                user_id: 'user-1',
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockTemplate),
            });

            const result = await updateReportTemplate('1', updateRequest);

            expect(result).toEqual(mockTemplate);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v2/report-templates/1'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(updateRequest),
                })
            );
        });
    });

    describe('deleteReportTemplate', () => {
        it('should delete a template', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 204,
            });

            await deleteReportTemplate('1');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/v2/report-templates/1'),
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });
    });
});
