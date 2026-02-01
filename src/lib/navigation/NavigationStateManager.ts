/**
 * Navigation State Manager
 * 
 * Manages multi-page navigation with state synchronization.
 * Inspired by ABT HeroFis Turkish app - seamless page transitions with state preservation.
 * 
 * Constitutional Tier: Tier 3 (Protected Determinism)
 */

import { projectPersistenceService, ProjectNavigationState } from '@/lib/fabricator/ProjectPersistenceService';

export type NavigationPage = 
  | 'design' 
  | 'optimization' 
  | 'production' 
  | 'quality' 
  | 'reports' 
  | 'projects' 
  | 'inventory'
  | 'customers'
  | 'settings';

export interface NavigationContext {
  currentPage: NavigationPage;
  previousPage?: NavigationPage;
  returnPath?: string;
  projectId?: string;
  poseId?: string;
  lastSaved?: Date;
  autoSaveEnabled: boolean;
  metadata?: Record<string, any>;
}

export class NavigationStateManager {
  private static readonly STORAGE_KEY = 'almona-navigation-state';
  private currentContext: NavigationContext | null = null;
  private listeners: Set<(context: NavigationContext) => void> = new Set();

  /**
   * Navigate to a page with state preservation
   */
  navigateTo(
    page: NavigationPage,
    options?: {
      returnPath?: string;
      projectId?: string;
      poseId?: string;
      metadata?: Record<string, any>;
      saveState?: boolean;
    }
  ): void {
    const previousPage = this.currentContext?.currentPage;
    
    this.currentContext = {
      currentPage: page,
      previousPage,
      returnPath: options?.returnPath,
      projectId: options?.projectId,
      poseId: options?.poseId,
      lastSaved: this.currentContext?.lastSaved,
      autoSaveEnabled: this.currentContext?.autoSaveEnabled ?? true,
      metadata: {
        ...this.currentContext?.metadata,
        ...options?.metadata,
      },
    };

    // Save navigation state
    if (options?.saveState !== false) {
      this.saveState();
    }

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Get return path after save (for navigation back)
   */
  getReturnPath(): string | null {
    return this.currentContext?.returnPath || projectPersistenceService.getReturnPath();
  }

  /**
   * Navigate back to return path
   */
  navigateBack(): void {
    const returnPath = this.getReturnPath();
    if (returnPath) {
      // Use React Router or window.location based on your setup
      if (typeof window !== 'undefined') {
        window.location.href = returnPath;
      }
    } else if (this.currentContext?.previousPage) {
      this.navigateTo(this.currentContext.previousPage, { saveState: false });
    }
  }

  /**
   * Mark as saved and update last saved timestamp
   */
  markSaved(projectId?: string, poseId?: string): void {
    if (this.currentContext) {
      this.currentContext.lastSaved = new Date();
      if (projectId) this.currentContext.projectId = projectId;
      if (poseId) this.currentContext.poseId = poseId;
      this.saveState();
      this.notifyListeners();
    }
  }

  /**
   * Get current navigation context
   */
  getCurrentContext(): NavigationContext | null {
    return this.currentContext;
  }

  /**
   * Subscribe to navigation state changes
   */
  subscribe(listener: (context: NavigationContext) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Load saved navigation state
   */
  loadState(): NavigationContext | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const raw = localStorage.getItem(NavigationStateManager.STORAGE_KEY);
      if (!raw) return null;
      
      const parsed = JSON.parse(raw);
      this.currentContext = {
        ...parsed,
        lastSaved: parsed.lastSaved ? new Date(parsed.lastSaved) : undefined,
      };
      
      return this.currentContext;
    } catch (error) {
      console.error('Error loading navigation state:', error);
      return null;
    }
  }

  /**
   * Save navigation state
   */
  private saveState(): void {
    if (typeof window === 'undefined' || !this.currentContext) return;
    
    try {
      // Also save to ProjectPersistenceService for cross-service sync
      const navState: ProjectNavigationState = {
        currentPage: this.currentContext.currentPage as any,
        returnPath: this.currentContext.returnPath,
        lastSaved: this.currentContext.lastSaved,
        autoSaveEnabled: this.currentContext.autoSaveEnabled,
      };
      projectPersistenceService.saveNavigationState(navState);

      // Save to localStorage
      localStorage.setItem(
        NavigationStateManager.STORAGE_KEY,
        JSON.stringify({
          ...this.currentContext,
          lastSaved: this.currentContext.lastSaved?.toISOString(),
        })
      );
    } catch (error) {
      console.error('Error saving navigation state:', error);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    if (!this.currentContext) return;
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentContext!);
      } catch (error) {
        console.error('Error in navigation listener:', error);
      }
    });
  }

  /**
   * Clear navigation state
   */
  clearState(): void {
    this.currentContext = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(NavigationStateManager.STORAGE_KEY);
    }
    this.notifyListeners();
  }
}

// Singleton instance
export const navigationStateManager = new NavigationStateManager();

// Initialize on load
if (typeof window !== 'undefined') {
  navigationStateManager.loadState();
}

