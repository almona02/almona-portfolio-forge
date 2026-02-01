/**
 * Project Activities API Tests
 * 
 * Phase 3 Enterprise Features - Integration Tests
 * Tests for project activities API service with mocked fetch and authentication.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    addActivityComment,
    createActivity,
    deleteActivityComment,
    getActivity,
    listProjectActivities,
    updateActivityComment,
    type ActivityCommentResponse,
    type ActivityListResponse,
    type ActivityResponse,
} from '../projectActivitiesApi';


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

describe('projectActivitiesApi', () => {
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

  describe('listProjectActivities', () => {
    it('should list project activities successfully', async () => {
      const mockResponse: ActivityListResponse = {
        activities: [
          {
            id: 'activity-1',
            projectId: 'project-1',
            activityType: 'created',
            userId: 'user-1',
            userName: 'Test User',
            userAvatar: 'https://example.com/avatar.jpg',
            title: 'Project created',
            description: 'Project was created',
            metadata: {},
            createdAt: '2026-01-15T10:00:00Z',
            comments: [],
            isRevertible: false,
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await listProjectActivities('project-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/projects/project-1/activities'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );

      expect(result.activities).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.activities[0].title).toBe('Project created');
    });

    it('should filter by type when provided', async () => {
      const mockResponse: ActivityListResponse = {
        activities: [],
        total: 0,
        limit: 50,
        offset: 0,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      await listProjectActivities('project-1', { type: 'project_created' });

      const fetchCall = (fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('type=project_created');
    });

    it('should filter by userId when provided', async () => {
      const mockResponse: ActivityListResponse = {
        activities: [],
        total: 0,
        limit: 50,
        offset: 0,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      await listProjectActivities('project-1', { userId: 'user-1' });

      const fetchCall = (fetch as any).mock.calls[0];
      expect(fetchCall[0]).toContain('userId=user-1');
    });

    it('should handle errors gracefully', async () => {
      (fetch as any).mockResolvedValue(
        createFetchResponse({ detail: 'Unauthorized' }, false)
      );

      await expect(listProjectActivities('project-1')).rejects.toThrow('Unauthorized');
    });
  });

  describe('getActivity', () => {
    it('should get an activity by ID', async () => {
      const mockResponse: ActivityResponse = {
        id: 'activity-1',
        projectId: 'project-1',
        activityType: 'field_changed',
        userId: 'user-1',
        userName: 'Test User',
        title: 'Field changed',
        description: 'Status changed',
        metadata: { field: 'status', oldValue: 'draft', newValue: 'active' },
        createdAt: '2026-01-15T10:00:00Z',
        comments: [],
        isRevertible: true,
        revertData: { status: 'draft' },
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await getActivity('project-1', 'activity-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/projects/project-1/activities/activity-1'),
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.id).toBe('activity-1');
      expect(result.title).toBe('Field changed');
    });

    it('should handle 404 errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => Promise.resolve({ detail: 'Not found' }),
      });

      await expect(getActivity('project-1', 'nonexistent')).rejects.toThrow(
        'Activity nonexistent not found'
      );
    });
  });

  describe('createActivity', () => {
    it('should create an activity successfully', async () => {
      const mockRequest = {
        projectId: 'project-1',
        activityType: 'comment_added' as const,
        title: 'Comment added',
        description: 'User added a comment',
        metadata: { commentId: 'comment-1' },
      };

      const mockResponse: ActivityResponse = {
        id: 'activity-2',
        projectId: 'project-1',
        activityType: 'comment_added',
        userId: 'user-1',
        userName: 'Test User',
        title: 'Comment added',
        description: 'User added a comment',
        metadata: { commentId: 'comment-1' },
        createdAt: '2026-01-15T11:00:00Z',
        comments: [],
        isRevertible: false,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse, true));

      const result = await createActivity('project-1', mockRequest);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/projects/project-1/activities'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(mockRequest),
        })
      );

      expect(result.id).toBe('activity-2');
      expect(result.title).toBe('Comment added');
    });
  });

  describe('addActivityComment', () => {
    it('should add a comment successfully', async () => {
      const mockRequest = {
        content: 'This is a test comment',
      };

      const mockResponse: ActivityCommentResponse = {
        id: 'comment-1',
        activityId: 'activity-1',
        authorId: 'user-1',
        authorName: 'Test User',
        authorAvatar: 'https://example.com/avatar.jpg',
        content: 'This is a test comment',
        createdAt: '2026-01-15T12:00:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await addActivityComment('project-1', 'activity-1', mockRequest);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/projects/project-1/activities/activity-1/comments'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
        })
      );

      expect(result.id).toBe('comment-1');
      expect(result.content).toBe('This is a test comment');
    });

    it('should handle validation errors', async () => {
      const mockRequest = {
        content: '',
      };

      (fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () =>
          Promise.resolve({ detail: 'Comment content is required' }),
      });

      await expect(
        addActivityComment('project-1', 'activity-1', mockRequest)
      ).rejects.toThrow('Comment content is required');
    });
  });

  describe('updateActivityComment', () => {
    it('should update a comment successfully', async () => {
      const mockRequest = {
        content: 'Updated comment content',
      };

      const mockResponse: ActivityCommentResponse = {
        id: 'comment-1',
        activityId: 'activity-1',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Updated comment content',
        createdAt: '2026-01-15T12:00:00Z',
        updatedAt: '2026-01-15T13:00:00Z',
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await updateActivityComment('project-1', 'activity-1', 'comment-1', mockRequest);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/projects/project-1/activities/activity-1/comments/comment-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(mockRequest),
        })
      );

      expect(result.content).toBe('Updated comment content');
      expect(result.updatedAt).toBe('2026-01-15T13:00:00Z');
    });

    it('should handle 404 errors', async () => {
      const mockRequest = {
        content: 'Updated content',
      };

      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => Promise.resolve({ detail: 'Comment not found' }),
      });

      await expect(
        updateActivityComment('project-1', 'activity-1', 'nonexistent', mockRequest)
      ).rejects.toThrow('Comment not found');
    });
  });

  describe('deleteActivityComment', () => {
    it('should delete a comment successfully', async () => {
      (fetch as any).mockResolvedValue(createFetchResponse({}, true));

      await deleteActivityComment('project-1', 'activity-1', 'comment-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v2/projects/project-1/activities/activity-1/comments/comment-1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle 404 errors', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => Promise.resolve({ detail: 'Comment not found' }),
      });

      await expect(
        deleteActivityComment('project-1', 'activity-1', 'nonexistent')
      ).rejects.toThrow('Comment not found');
    });
  });

  describe('listProjectActivities conversion', () => {
    it('should return activities with proper type conversion', async () => {
      const mockResponse: ActivityListResponse = {
        activities: [
          {
            id: 'activity-1',
            projectId: 'project-1',
            activityType: 'created',
            userId: 'user-1',
            userName: 'Test User',
            title: 'Project created',
            metadata: {},
            createdAt: '2026-01-15T10:00:00Z',
            comments: [],
            isRevertible: false,
          },
          {
            id: 'activity-2',
            projectId: 'project-1',
            activityType: 'field_changed',
            userId: 'user-1',
            userName: 'Test User',
            title: 'Field changed',
            metadata: { field: 'status' },
            createdAt: '2026-01-15T11:00:00Z',
            comments: [],
            isRevertible: true,
          },
        ],
        total: 2,
        limit: 50,
        offset: 0,
      };

      (fetch as any).mockResolvedValue(createFetchResponse(mockResponse));

      const result = await listProjectActivities('project-1');

      expect(result.activities).toHaveLength(2);
      expect(result.activities[0].activityType).toBe('created');
      expect(result.activities[1].activityType).toBe('field_changed');
    });
  });
});
