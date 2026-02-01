/**
 * Filter Presets API Tests
 * 
 * Phase 3 Enterprise Features - Integration Tests
 * Tests for filter presets API service with mocked fetch and authentication.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listFilterPresets,
  getFilterPreset,
  createFilterPreset,
  updateFilterPreset,
  deleteFilterPreset,
  convertToFilterPreset,
  type FilterPresetResponse,
} from '../filterPresetsApi';
import type { FilterDomain } from '../FilterService';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock the global fetch
global.fetch = vi.fn();

const createFetchResponse = (data: any, ok: boolean = true) => ({
  ok,
  status: ok ? 200 : 400,
  statusText: ok ? 'OK' : 'Bad Request',
  json: async () => Promise.resolve(data),
  headers: new Headers(),
});

describe('filterPresetsApi', () => {
  const mockToken = 'test-auth-token-123';
  const mockSession = {
    data: {
      session: {
        access_token: mockToken,
      },
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const supabaseModule = await import('@/lib/supabase');
    const { supabase } = supabaseModule;
    (supabase.auth.getSession as any).mockResolvedValue(mockSession);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listFilterPresets', () => {
    it('should list filter presets successfully', async () => {
      const mockResponse = {
        presets: [
          {
            id: 'preset-1',
            userId: 'user-1',
            name: 'Test Preset',
            domain: 'projects' as FilterDomain,
            filters: { domain: 'projects' },
            createdAt: '2026-01-15T10:00:00Z',
            updatedAt: '2026-01-15T10:00:00Z',
          },
        ],
        total: 1,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await listFilterPresets();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/filter-presets'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );

      expect(result.presets).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.presets[0].name).toBe('Test Preset');
    });

    it('should filter by domain when provided', async () => {
      const mockResponse = {
        presets: [],
        total: 0,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      await listFilterPresets('projects');

      const fetchCall = (fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('domain=projects');
    });

    it('should handle errors gracefully', async () => {
      (fetch as any).mockResolvedValue(
        createFetchResponse({ detail: 'Unauthorized' }, false)
      );

      await expect(listFilterPresets()).rejects.toThrow('Unauthorized');
    });

    it('should throw error when no auth token', async () => {
      const supabaseModule = await import('@/lib/supabase');
      const { supabase } = supabaseModule;
      (supabase.auth.getSession as any).mockResolvedValueOnce({
        data: { session: null },
      });

      await expect(listFilterPresets()).rejects.toThrow('No auth token');
    });
  });

  describe('getFilterPreset', () => {
    it('should get a filter preset by ID', async () => {
      const mockResponse: FilterPresetResponse = {
        id: 'preset-1',
        userId: 'user-1',
        name: 'Test Preset',
        domain: 'projects',
        filters: { domain: 'projects' },
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await getFilterPreset('preset-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/filter-presets/preset-1'),
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.id).toBe('preset-1');
      expect(result.name).toBe('Test Preset');
    });

    it('should handle 404 errors', async () => {
      (fetch as any).mockResolvedValue(
        createFetchResponse({ detail: 'Not found' }, false)
      );
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => Promise.resolve({ detail: 'Not found' }),
      });

      await expect(getFilterPreset('nonexistent')).rejects.toThrow(
        'Filter preset nonexistent not found'
      );
    });
  });

  describe('createFilterPreset', () => {
    it('should create a filter preset successfully', async () => {
      const mockRequest = {
        name: 'New Preset',
        domain: 'projects' as FilterDomain,
        filters: { domain: 'projects' },
      };

      const mockResponse: FilterPresetResponse = {
        id: 'preset-2',
        userId: 'user-1',
        name: 'New Preset',
        domain: 'projects',
        filters: { domain: 'projects' },
        createdAt: '2026-01-15T11:00:00Z',
        updatedAt: '2026-01-15T11:00:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse, true));

      const result = await createFilterPreset(mockRequest);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/filter-presets'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(mockRequest),
        })
      );

      expect(result.id).toBe('preset-2');
      expect(result.name).toBe('New Preset');
    });

    it('should handle 409 conflict errors (duplicate name)', async () => {
      const mockRequest = {
        name: 'Duplicate Preset',
        domain: 'projects' as FilterDomain,
        filters: { domain: 'projects' },
      };

      (fetch as any).mockResolvedValue({
        ok: false,
        status: 409,
        json: async () =>
          Promise.resolve({ detail: 'Preset name already exists' }),
      });

      await expect(createFilterPreset(mockRequest)).rejects.toThrow(
        'Preset name already exists'
      );
    });
  });

  describe('updateFilterPreset', () => {
    it('should update a filter preset successfully', async () => {
      const mockRequest = {
        name: 'Updated Preset',
        filters: { domain: 'projects', projects: { status: ['active'] } },
      };

      const mockResponse: FilterPresetResponse = {
        id: 'preset-1',
        userId: 'user-1',
        name: 'Updated Preset',
        domain: 'projects',
        filters: { domain: 'projects', projects: { status: ['active'] } },
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T12:00:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await updateFilterPreset('preset-1', mockRequest);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/filter-presets/preset-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockRequest),
        })
      );

      expect(result.name).toBe('Updated Preset');
    });
  });

  describe('deleteFilterPreset', () => {
    it('should delete a filter preset successfully', async () => {
      (fetch as any).mockResolvedValue(createFetchResponse({}, true));

      await deleteFilterPreset('preset-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/filter-presets/preset-1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('convertToFilterPreset', () => {
    it('should convert backend response to frontend format', () => {
      const backendResponse: FilterPresetResponse = {
        id: 'preset-1',
        userId: 'user-1',
        name: 'Test Preset',
        domain: 'projects',
        filters: { domain: 'projects' },
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      };

      const result = convertToFilterPreset(backendResponse);

      expect(result.id).toBe('preset-1');
      expect(result.name).toBe('Test Preset');
      expect(result.domain).toBe('projects');
      expect(result.filters).toEqual({ domain: 'projects' });
      expect(result.createdAt).toBe('2026-01-15T10:00:00Z');
      expect(result.updatedAt).toBe('2026-01-15T10:00:00Z');
    });
  });
});
