/**
 * Project Templates API Tests
 * 
 * Phase 3 Enterprise Features - Integration Tests
 * Tests for project templates API service with mocked fetch and authentication.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  uploadTemplateThumbnail,
  convertToProjectTemplate,
  type TemplateResponse,
  type TemplateListResponse,
  type TemplateCloneResponse,
} from '../projectTemplatesApi';
import type { TemplateCategory } from '@/components/ui/ProjectTemplates';

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

describe('projectTemplatesApi', () => {
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

  describe('listTemplates', () => {
    it('should list templates successfully', async () => {
      const mockResponse: TemplateListResponse = {
        templates: [
          {
            id: 'template-1',
            name: 'Test Template',
            description: 'Test description',
            category: 'residential' as TemplateCategory,
            tags: ['tag1', 'tag2'],
            thumbnail: 'https://example.com/thumb.jpg',
            projectData: {},
            authorId: 'user-1',
            authorName: 'Test User',
            createdAt: '2026-01-15T10:00:00Z',
            updatedAt: '2026-01-15T10:00:00Z',
            usageCount: 5,
            isPublic: false,
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await listTemplates();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/project-templates'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );

      expect(result.templates).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.templates[0].name).toBe('Test Template');
    });

    it('should filter by category when provided', async () => {
      const mockResponse: TemplateListResponse = {
        templates: [],
        total: 0,
        limit: 50,
        offset: 0,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      await listTemplates({ category: 'commercial' });

      const fetchCall = (fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('category=commercial');
    });

    it('should filter by tags when provided', async () => {
      const mockResponse: TemplateListResponse = {
        templates: [],
        total: 0,
        limit: 50,
        offset: 0,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      await listTemplates({ tags: ['tag1', 'tag2'] });

      const fetchCall = (fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('tags=tag1%2Ctag2');
    });

    it('should handle errors gracefully', async () => {
      (fetch as any).mockResolvedValue(
        createFetchResponse({ detail: 'Unauthorized' }, false)
      );

      await expect(listTemplates()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getTemplate', () => {
    it('should get a template by ID', async () => {
      const mockResponse: TemplateResponse = {
        id: 'template-1',
        name: 'Test Template',
        description: 'Test description',
        category: 'residential' as TemplateCategory,
        tags: ['tag1'],
        thumbnail: 'https://example.com/thumb.jpg',
        projectData: {},
        authorId: 'user-1',
        authorName: 'Test User',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
        usageCount: 5,
        isPublic: false,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await getTemplate('template-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/project-templates/template-1'),
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.id).toBe('template-1');
      expect(result.name).toBe('Test Template');
    });

    it('should handle 404 errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => Promise.resolve({ detail: 'Not found' }),
      });

      await expect(getTemplate('nonexistent')).rejects.toThrow(
        'Template nonexistent not found'
      );
    });
  });

  describe('createTemplate', () => {
    it('should create a template successfully', async () => {
      const mockRequest = {
        name: 'New Template',
        description: 'New description',
        category: 'commercial' as TemplateCategory,
        tags: ['tag1'],
        projectId: 'project-1',
      };

      const mockResponse: TemplateResponse = {
        id: 'template-2',
        name: 'New Template',
        description: 'New description',
        category: 'commercial' as TemplateCategory,
        tags: ['tag1'],
        projectData: {},
        authorId: 'user-1',
        createdAt: '2026-01-15T11:00:00Z',
        updatedAt: '2026-01-15T11:00:00Z',
        usageCount: 0,
        isPublic: false,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse, true));

      const result = await createTemplate(mockRequest);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/project-templates'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(mockRequest),
        })
      );

      expect(result.id).toBe('template-2');
      expect(result.name).toBe('New Template');
    });

    it('should handle validation errors', async () => {
      const mockRequest = {
        name: '',
        category: 'residential' as TemplateCategory,
        projectId: 'project-1',
      };

      (fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () =>
          Promise.resolve({ detail: 'Template name is required' }),
      });

      await expect(createTemplate(mockRequest)).rejects.toThrow(
        'Template name is required'
      );
    });
  });

  describe('updateTemplate', () => {
    it('should update a template successfully', async () => {
      const mockRequest = {
        name: 'Updated Template',
        description: 'Updated description',
        category: 'custom' as TemplateCategory,
        tags: ['tag1', 'tag2'],
      };

      const mockResponse: TemplateResponse = {
        id: 'template-1',
        name: 'Updated Template',
        description: 'Updated description',
        category: 'custom' as TemplateCategory,
        tags: ['tag1', 'tag2'],
        projectData: {},
        authorId: 'user-1',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T12:00:00Z',
        usageCount: 5,
        isPublic: false,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await updateTemplate('template-1', mockRequest);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/project-templates/template-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockRequest),
        })
      );

      expect(result.name).toBe('Updated Template');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template successfully', async () => {
      (fetch as any).mockResolvedValue(createFetchResponse({}, true));

      await deleteTemplate('template-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/project-templates/template-1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle 404 errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => Promise.resolve({ detail: 'Template not found' }),
      });

      await expect(deleteTemplate('nonexistent')).rejects.toThrow(
        'Template not found'
      );
    });
  });

  describe('cloneTemplate', () => {
    it('should clone a template successfully', async () => {
      const mockRequest = {
        projectName: 'Cloned Project',
        projectDescription: 'Cloned from template',
      };

      const mockResponse: TemplateCloneResponse = {
        templateId: 'template-1',
        projectId: 'project-clone-1',
        projectName: 'Cloned Project',
        createdAt: '2026-01-15T13:00:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await cloneTemplate('template-1', mockRequest);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/project-templates/template-1/clone'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
        })
      );

      expect(result.projectId).toBe('project-clone-1');
      expect(result.templateId).toBe('template-1');
    });
  });

  describe('uploadTemplateThumbnail', () => {
    it('should upload a thumbnail successfully', async () => {
      const mockFile = new File(['test'], 'thumb.jpg', { type: 'image/jpeg' });
      const mockResponse = {
        thumbnail: 'https://example.com/thumb-uploaded.jpg',
        updatedAt: '2026-01-15T14:00:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await uploadTemplateThumbnail('template-1', mockFile);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/project-templates/template-1/thumbnail'),
        expect.objectContaining({
          method: 'POST',
        })
      );

      const fetchCall = (fetch as any).mock.calls[0];
      expect(fetchCall[1].body).toBeInstanceOf(FormData);

      expect(result.thumbnail).toBe('https://example.com/thumb-uploaded.jpg');
    });

    it('should handle upload errors', async () => {
      const mockFile = new File(['test'], 'thumb.jpg', { type: 'image/jpeg' });

      (fetch as any).mockResolvedValue({
        ok: false,
        status: 413,
        json: async () =>
          Promise.resolve({ detail: 'File too large' }),
      });

      await expect(uploadTemplateThumbnail('template-1', mockFile)).rejects.toThrow(
        'File too large'
      );
    });
  });

  describe('convertToProjectTemplate', () => {
    it('should convert backend response to frontend format', () => {
      const backendResponse: TemplateResponse = {
        id: 'template-1',
        name: 'Test Template',
        description: 'Test description',
        category: 'residential' as TemplateCategory,
        tags: ['tag1', 'tag2'],
        thumbnail: 'https://example.com/thumb.jpg',
        projectData: { test: 'data' },
        authorId: 'user-1',
        authorName: 'Test User',
        createdAt: '2026-01-15T10:00:00Z',
        updatedAt: '2026-01-15T10:00:00Z',
        usageCount: 5,
        isPublic: false,
      };

      const result = convertToProjectTemplate(backendResponse);

      expect(result.id).toBe('template-1');
      expect(result.name).toBe('Test Template');
      expect(result.category).toBe('residential');
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.projectData).toEqual({ test: 'data' });
      expect(result.createdAt).toBe('2026-01-15T10:00:00Z');
      expect(result.updatedAt).toBe('2026-01-15T10:00:00Z');
    });
  });
});
