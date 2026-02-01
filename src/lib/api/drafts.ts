/**
 * Draft API Service
 * 
 * Handles saving, loading, and listing user drafts from Supabase.
 * Falls back to localStorage for guest users or when backend is unavailable.
 */

import { supabase } from '@/lib/supabase';
import type { DraftingState } from '@/components/fabricator/drafting/types/drafting';

export interface DraftMetadata {
  id: string;
  user_id: string;
  name: string;
  twincode: string;
  created_at: string;
  updated_at: string;
  thumbnail?: string;
  element_count?: number;
}

export interface DraftData {
  id: string;
  user_id: string;
  name: string;
  twincode: string;
  data: DraftingState;
  created_at: string;
  updated_at: string;
}

/**
 * Save draft to Supabase (with localStorage fallback)
 */
export async function saveDraft(
  userId: string,
  draftData: DraftingState,
  draftName?: string,
  twincode?: string
): Promise<{ success: boolean; draftId?: string; twincode?: string; usedFallback: boolean }> {
  try {
    // Generate twincode if not provided
    const finalTwincode = twincode || `DR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const name = draftName || `Draft ${new Date().toLocaleDateString()}`;

    // Try Supabase first
    const { data, error } = await supabase
      .from('drafts')
      .insert({
        user_id: userId,
        name,
        twincode: finalTwincode,
        data: draftData,
        updated_at: new Date().toISOString(),
      })
      .select('id, twincode')
      .single();

    if (!error && data) {
      // Also save to localStorage as backup
      const localStorageKey = `draft-${data.id}`;
      localStorage.setItem(localStorageKey, JSON.stringify({
        id: data.id,
        userId,
        name,
        twincode: finalTwincode,
        data: draftData,
        timestamp: Date.now(),
      }));

      return {
        success: true,
        draftId: data.id,
        twincode: finalTwincode,
        usedFallback: false,
      };
    }

    // Fallback to localStorage if Supabase fails
    const fallbackId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const localStorageKey = `draft-${fallbackId}`;
    localStorage.setItem(localStorageKey, JSON.stringify({
      id: fallbackId,
      userId,
      name,
      twincode: finalTwincode,
      data: draftData,
      timestamp: Date.now(),
    }));

    // Save to drafts list
    const draftsList = JSON.parse(localStorage.getItem('user-drafts-list') || '[]');
    draftsList.push({
      id: fallbackId,
      userId,
      name,
      twincode: finalTwincode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem('user-drafts-list', JSON.stringify(draftsList));

    return {
      success: true,
      draftId: fallbackId,
      twincode: finalTwincode,
      usedFallback: true,
    };
  } catch (error) {
    console.error('Failed to save draft:', error);
    return { success: false, usedFallback: true };
  }
}

/**
 * Update existing draft
 */
export async function updateDraft(
  draftId: string,
  userId: string,
  draftData: DraftingState,
  draftName?: string
): Promise<{ success: boolean; usedFallback: boolean }> {
  try {
    // Try Supabase first
    const { error } = await supabase
      .from('drafts')
      .update({
        name: draftName,
        data: draftData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draftId)
      .eq('user_id', userId);

    if (!error) {
      // Update localStorage backup
      const localStorageKey = `draft-${draftId}`;
      const existing = localStorage.getItem(localStorageKey);
      if (existing) {
        const parsed = JSON.parse(existing);
        localStorage.setItem(localStorageKey, JSON.stringify({
          ...parsed,
          data: draftData,
          name: draftName || parsed.name,
          timestamp: Date.now(),
        }));
      }

      return { success: true, usedFallback: false };
    }

    // Fallback to localStorage
    const localStorageKey = `draft-${draftId}`;
    const existing = localStorage.getItem(localStorageKey);
    if (existing) {
      const parsed = JSON.parse(existing);
      localStorage.setItem(localStorageKey, JSON.stringify({
        ...parsed,
        data: draftData,
        name: draftName || parsed.name,
        timestamp: Date.now(),
      }));

      // Update drafts list
      const draftsList = JSON.parse(localStorage.getItem('user-drafts-list') || '[]');
      const index = draftsList.findIndex((d: any) => d.id === draftId);
      if (index !== -1) {
        draftsList[index] = {
          ...draftsList[index],
          name: draftName || draftsList[index].name,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem('user-drafts-list', JSON.stringify(draftsList));
      }

      return { success: true, usedFallback: true };
    }

    return { success: false, usedFallback: true };
  } catch (error) {
    console.error('Failed to update draft:', error);
    return { success: false, usedFallback: true };
  }
}

/**
 * Load draft by ID
 */
export async function loadDraft(
  draftId: string,
  userId: string
): Promise<{ success: boolean; data?: DraftingState; metadata?: DraftMetadata; usedFallback: boolean }> {
  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('drafts')
      .select('id, user_id, name, twincode, data, created_at, updated_at')
      .eq('id', draftId)
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      return {
        success: true,
        data: data.data as DraftingState,
        metadata: {
          id: data.id,
          user_id: data.user_id,
          name: data.name,
          twincode: data.twincode,
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
        usedFallback: false,
      };
    }

    // Fallback to localStorage
    const localStorageKey = `draft-${draftId}`;
    const stored = localStorage.getItem(localStorageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.userId === userId) {
        return {
          success: true,
          data: parsed.data,
          metadata: {
            id: parsed.id,
            user_id: parsed.userId,
            name: parsed.name,
            twincode: parsed.twincode,
            created_at: new Date(parsed.timestamp).toISOString(),
            updated_at: new Date(parsed.timestamp).toISOString(),
          },
          usedFallback: true,
        };
      }
    }

    return { success: false, usedFallback: true };
  } catch (error) {
    console.error('Failed to load draft:', error);
    return { success: false, usedFallback: true };
  }
}

/**
 * List user's drafts
 */
export async function listDrafts(userId: string): Promise<{ drafts: DraftMetadata[]; usedFallback: boolean }> {
  try {
    // Try Supabase first
    const { data, error } = await supabase
      .from('drafts')
      .select('id, user_id, name, twincode, created_at, updated_at, data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      const drafts: DraftMetadata[] = data.map((draft: any) => ({
        id: draft.id,
        user_id: draft.user_id,
        name: draft.name,
        twincode: draft.twincode,
        created_at: draft.created_at,
        updated_at: draft.updated_at,
        element_count: draft.data?.geometry
          ? (draft.data.geometry.rectangles?.length || 0) +
            (draft.data.geometry.circles?.length || 0) +
            (draft.data.geometry.lines?.length || 0) +
            (draft.data.geometry.arcs?.length || 0) +
            (draft.data.geometry.polygons?.length || 0) +
            (draft.data.geometry.splines?.length || 0)
          : 0,
      }));

      return { drafts, usedFallback: false };
    }

    // Fallback to localStorage
    const draftsList = JSON.parse(localStorage.getItem('user-drafts-list') || '[]');
    const userDrafts = draftsList.filter((d: any) => d.userId === userId);
    
    // Load full data to get element counts
    const drafts: DraftMetadata[] = userDrafts.map((draft: any) => {
      const localStorageKey = `draft-${draft.id}`;
      const stored = localStorage.getItem(localStorageKey);
      let elementCount = 0;
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.data?.geometry) {
            elementCount = (parsed.data.geometry.rectangles?.length || 0) +
              (parsed.data.geometry.circles?.length || 0) +
              (parsed.data.geometry.lines?.length || 0) +
              (parsed.data.geometry.arcs?.length || 0) +
              (parsed.data.geometry.polygons?.length || 0) +
              (parsed.data.geometry.splines?.length || 0);
          }
        } catch {
          // Ignore parse errors
        }
      }

      return {
        id: draft.id,
        user_id: draft.userId,
        name: draft.name,
        twincode: draft.twincode,
        created_at: draft.createdAt,
        updated_at: draft.updatedAt,
        element_count: elementCount,
      };
    });

    return { drafts, usedFallback: true };
  } catch (error) {
    console.error('Failed to list drafts:', error);
    return { drafts: [], usedFallback: true };
  }
}

/**
 * Delete draft
 */
export async function deleteDraft(draftId: string, userId: string): Promise<{ success: boolean; usedFallback: boolean }> {
  try {
    // Try Supabase first
    const { error } = await supabase
      .from('drafts')
      .delete()
      .eq('id', draftId)
      .eq('user_id', userId);

    if (!error) {
      // Remove from localStorage backup
      localStorage.removeItem(`draft-${draftId}`);

      // Remove from drafts list
      const draftsList = JSON.parse(localStorage.getItem('user-drafts-list') || '[]');
      const filtered = draftsList.filter((d: any) => d.id !== draftId);
      localStorage.setItem('user-drafts-list', JSON.stringify(filtered));

      return { success: true, usedFallback: false };
    }

    // Fallback to localStorage
    localStorage.removeItem(`draft-${draftId}`);
    const draftsList = JSON.parse(localStorage.getItem('user-drafts-list') || '[]');
    const filtered = draftsList.filter((d: any) => d.id !== draftId);
    localStorage.setItem('user-drafts-list', JSON.stringify(filtered));

    return { success: true, usedFallback: true };
  } catch (error) {
    console.error('Failed to delete draft:', error);
    return { success: false, usedFallback: true };
  }
}
