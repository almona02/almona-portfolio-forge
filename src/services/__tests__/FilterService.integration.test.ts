/**
 * FilterService Integration Tests
 * 
 * Phase 3 Enterprise Features - Integration Tests
 * Tests FilterService integration with filterPresetsApi (with mocked API).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FilterPreset, FilterSet } from '../FilterService';
import { FilterService } from '../FilterService';
import type { FilterPresetResponse } from '../filterPresetsApi';

// Mock filterPresetsApi
vi.mock('../filterPresetsApi', async () => {
  const actual = await vi.importActual<typeof import('../filterPresetsApi')>('../filterPresetsApi');
  return {
    ...actual,
    listFilterPresets: vi.fn(),
    createFilterPreset: vi.fn(),
    deleteFilterPreset: vi.fn(),
    convertToFilterPreset: vi.fn((preset: FilterPresetResponse) =>
      ({ id: preset.id, name: preset.name, domain: preset.domain, filters: preset.filters, createdAt: preset.createdAt, updatedAt: preset.updatedAt })
    ),
  };
});

// Mock supabase for localStorage fallback
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('FilterService - API Integration', () => {
  let filterService: FilterService;
  let mockListPresets: ReturnType<typeof vi.fn>;
  let mockCreatePreset: ReturnType<typeof vi.fn>;
  let mockDeletePreset: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    filterService = new FilterService('projects');
    vi.clearAllMocks();

    // Get mocked functions
    const filterPresetsApi = await import('../filterPresetsApi');
    mockListPresets = vi.mocked(filterPresetsApi.listFilterPresets);
    mockCreatePreset = vi.mocked(filterPresetsApi.createFilterPreset);
    mockDeletePreset = vi.mocked(filterPresetsApi.deleteFilterPreset);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('savePreset', () => {
    it('should save preset via API successfully', async () => {
      const mockResponse = {
        id: 'preset-api-1',
        userId: 'user-1',
        name: 'API Preset',
        domain: 'projects',
        filters: { domain: 'projects' },
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
      };

      mockCreatePreset.mockResolvedValue(mockResponse);

      const filters: FilterSet = {
        domain: 'projects',
        projects: { status: ['active'] },
      };

      const result = await filterService.savePreset('API Preset', filters);

      expect(mockCreatePreset).toHaveBeenCalledWith({
        name: 'API Preset',
        domain: 'projects',
        filters,
      });
      expect(result.id).toBe('preset-api-1');
    });

    it('should fallback to localStorage on API error', async () => {
      mockCreatePreset.mockRejectedValue(new Error('API Error'));

      const filters: FilterSet = {
        domain: 'projects',
        projects: { status: ['active'] },
      };

      const result = await filterService.savePreset('Fallback Preset', filters);

      // Should still return an ID (from localStorage fallback)
      expect(result.id).toBeDefined();
      expect(result.id).toContain('preset_');

      // Verify localStorage was used
      const stored = localStorage.getItem('almona_filter_state_presets');
      expect(stored).toBeTruthy();
      const presets = JSON.parse(stored!) as FilterPreset[];
      expect(presets.length).toBeGreaterThan(0);
    });
  });

  describe('listPresets', () => {
    it('should list presets via API successfully', async () => {
      const mockResponse = {
        presets: [
          {
            id: 'preset-1',
            userId: 'user-1',
            name: 'Preset 1',
            domain: 'projects',
            filters: { domain: 'projects' },
            createdAt: '2026-01-15T10:00:00Z',
            updatedAt: '2026-01-15T10:00:00Z',
          },
          {
            id: 'preset-2',
            userId: 'user-1',
            name: 'Preset 2',
            domain: 'projects',
            filters: { domain: 'projects' },
            createdAt: '2026-01-15T11:00:00Z',
            updatedAt: '2026-01-15T11:00:00Z',
          },
        ],
        total: 2,
      };

      mockListPresets.mockResolvedValue(mockResponse);

      const result = await filterService.listPresets();

      expect(mockListPresets).toHaveBeenCalledWith(undefined);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Preset 1');
    });

    it('should filter by domain when provided', async () => {
      const mockResponse = { presets: [], total: 0 };
      mockListPresets.mockResolvedValue(mockResponse);

      await filterService.listPresets('positions');

      expect(mockListPresets).toHaveBeenCalledWith('positions');
    });

    it('should fallback to localStorage on API error', async () => {
      // Pre-populate localStorage
      const fallbackPresets = [
        {
          id: 'preset-local-1',
          name: 'Local Preset',
          domain: 'projects',
          filters: { domain: 'projects' },
          createdAt: '2026-01-15T10:00:00Z',
          updatedAt: '2026-01-15T10:00:00Z',
        },
      ];
      localStorage.setItem(
        'almona_filter_state_presets',
        JSON.stringify(fallbackPresets)
      );

      mockListPresets.mockRejectedValue(new Error('API Error'));

      const result = await filterService.listPresets();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Local Preset');
    });
  });

  describe('deletePreset', () => {
    it('should delete preset via API successfully', async () => {
      mockDeletePreset.mockResolvedValue(undefined);

      await filterService.deletePreset('preset-1');

      expect(mockDeletePreset).toHaveBeenCalledWith('preset-1');
    });

    it('should fallback to localStorage on API error', async () => {
      // Pre-populate localStorage
      const presets = [
        {
          id: 'preset-1',
          name: 'Preset 1',
          domain: 'projects',
          filters: { domain: 'projects' },
          createdAt: '2026-01-15T10:00:00Z',
          updatedAt: '2026-01-15T10:00:00Z',
        },
        {
          id: 'preset-2',
          name: 'Preset 2',
          domain: 'projects',
          filters: { domain: 'projects' },
          createdAt: '2026-01-15T11:00:00Z',
          updatedAt: '2026-01-15T11:00:00Z',
        },
      ];
      localStorage.setItem(
        'almona_filter_state_presets',
        JSON.stringify(presets)
      );

      mockDeletePreset.mockRejectedValue(new Error('API Error'));

      await filterService.deletePreset('preset-1');

      // Verify preset was removed from localStorage
      const stored = localStorage.getItem('almona_filter_state_presets');
      const updatedPresets = JSON.parse(stored!) as FilterPreset[];
      expect(updatedPresets).toHaveLength(1);
      expect(updatedPresets[0].id).toBe('preset-2');
    });
  });

  describe('API integration with filter operations', () => {
    it('should maintain filter state while using API for presets', async () => {
      const filters: FilterSet = {
        domain: 'projects',
        projects: { status: ['active'], tags: ['urgent'] },
      };

      filterService.set(filters);
      const current = filterService.getCurrent();

      expect(current.projects?.status).toEqual(['active']);
      expect(current.projects?.tags).toEqual(['urgent']);

      // API operations should not affect current filter state
      mockListPresets.mockResolvedValue({ presets: [], total: 0 });
      await filterService.listPresets();

      const stillCurrent = filterService.getCurrent();
      expect(stillCurrent.projects?.status).toEqual(['active']);
    });
  });
});
