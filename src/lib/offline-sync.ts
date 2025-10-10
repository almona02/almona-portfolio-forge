// Enhanced offline synchronization with push notifications
// Handles offline ticket storage and synchronization when connection is restored

import React from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface OfflineTicket {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: 'emergency' | 'maintenance' | 'parts' | 'support';
  priority: 'low' | 'medium' | 'high' | 'critical';
  machine_id?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  images?: File[];
  audio_notes?: File[];
  offline_timestamp: string;
  status: 'open';
  source: 'mobile';
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
}

class OfflineSyncService {
  private readonly STORAGE_KEY = 'offline_tickets';
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private syncInterval: number | null = null;
  private isOnline = navigator.onLine;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.initializeService();
    this.setupEventListeners();
  }

  private initializeService() {
    // Register service worker for background sync and push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          this.registration = registration;
          console.log('SW registered:', registration);
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    }

    // Start sync interval
    this.startSyncInterval();
  }

  private setupEventListeners() {
    // Online/offline status monitoring
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleConnectionRestored();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showOfflineNotification();
    });

    // Background sync when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.syncOfflineTickets();
      }
    });
  }

  // Store ticket offline
  public async storeOfflineTicket(ticket: Omit<OfflineTicket, 'id' | 'offline_timestamp'>): Promise<string> {
    const offlineTicket: OfflineTicket = {
      ...ticket,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      offline_timestamp: new Date().toISOString()
    };

    try {
      const stored = this.getStoredTickets();
      stored.push(offlineTicket);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
      
      // Show offline confirmation
      toast.info('تم حفظ الطلب محلياً - سيتم إرساله عند توفر الإنترنت', {
        duration: 5000,
        action: {
          label: 'عرض المحفوظة',
          onClick: () => this.showOfflineTickets()
        }
      });

      return offlineTicket.id;
    } catch (error) {
      console.error('Failed to store offline ticket:', error);
      throw new Error('فشل في حفظ الطلب محلياً');
    }
  }

  // Get stored offline tickets
  public getStoredTickets(): OfflineTicket[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve offline tickets:', error);
      return [];
    }
  }

  // Sync offline tickets when connection is restored
  public async syncOfflineTickets(): Promise<void> {
    const offlineTickets = this.getStoredTickets();
    
    if (offlineTickets.length === 0 || !this.isOnline) {
      return;
    }

    console.log(`Syncing ${offlineTickets.length} offline tickets...`);
    
    const syncPromises = offlineTickets.map(async (ticket) => {
      try {
        // Prepare ticket data for submission
        const submissionData = {
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          user_id: ticket.user_id,
          machine_id: ticket.machine_id,
          status: ticket.status,
          source: ticket.source,
          location: ticket.location,
          created_at: ticket.offline_timestamp
        };

        // Submit to Supabase
        const { data, error } = await supabase
          .from('service_tickets')
          .insert(submissionData)
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Upload files if any (simplified - in real implementation would upload to storage)
        if (ticket.images && ticket.images.length > 0) {
          await this.uploadTicketFiles(data.id, ticket.images, 'images');
        }

        if (ticket.audio_notes && ticket.audio_notes.length > 0) {
          await this.uploadTicketFiles(data.id, ticket.audio_notes, 'audio');
        }

        console.log(`Successfully synced offline ticket: ${ticket.id} -> ${data.id}`);
        return ticket.id;

      } catch (error) {
        console.error(`Failed to sync ticket ${ticket.id}:`, error);
        throw error;
      }
    });

    try {
      const syncedIds = await Promise.all(syncPromises);
      
      // Remove successfully synced tickets from local storage
      const remaining = offlineTickets.filter(ticket => !syncedIds.includes(ticket.id));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(remaining));
      
      // Show success notification
      this.showSyncSuccessNotification(syncedIds.length);
      
    } catch (error) {
      console.error('Sync failed for some tickets:', error);
      toast.error('فشل في مزامنة بعض الطلبات - سيتم المحاولة مرة أخرى');
    }
  }

  // Upload ticket files (placeholder implementation)
  private async uploadTicketFiles(ticketId: string, files: File[], type: 'images' | 'audio'): Promise<void> {
    // In a real implementation, this would upload files to Supabase Storage
    // For now, we'll just log the action
    console.log(`Uploading ${files.length} ${type} files for ticket ${ticketId}`);
  }

  // Handle connection restored
  private handleConnectionRestored() {
    toast.success('تم استعادة الاتصال بالإنترنت');
    this.syncOfflineTickets();
  }

  // Show offline notification
  private showOfflineNotification() {
    toast.warning('لا يوجد اتصال بالإنترنت - سيتم حفظ البيانات محلياً', {
      duration: 5000
    });
  }

  // Show sync success notification
  private showSyncSuccessNotification(count: number) {
    toast.success(`تم مزامنة ${count} طلب بنجاح ✅`);
  }

  // Show offline tickets count
  private showOfflineTickets() {
    const count = this.getStoredTickets().length;
    toast.info(`عدد الطلبات المحفوظة محلياً: ${count}`);
  }

  // Start sync interval
  private startSyncInterval() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && this.getStoredTickets().length > 0) {
        this.syncOfflineTickets();
      }
    }, this.SYNC_INTERVAL);
  }

  // Stop sync interval
  public stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Request notification permission
  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Show push notification
  public async showNotification(payload: PushNotificationPayload): Promise<void> {
    const hasPermission = await this.requestNotificationPermission();
    
    if (!hasPermission) {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      if (this.registration) {
        // Use service worker for better notification management
        await this.registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/pwa-192x192.png',
          badge: payload.badge || '/icons/pwa-192x192.png',
          tag: payload.tag || 'almona-notification',
          data: payload.data,
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: 'عرض',
              icon: '/icons/view-icon.png'
            },
            {
              action: 'dismiss',
              title: 'إغلاق',
              icon: '/icons/dismiss-icon.png'
            }
          ]
        });
      } else {
        // Fallback to basic notification
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/pwa-192x192.png'
        });
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Get offline status
  public isOffline(): boolean {
    return !this.isOnline;
  }

  // Get pending sync count
  public getPendingSyncCount(): number {
    return this.getStoredTickets().length;
  }

  // Clear all offline data (use with caution)
  public clearOfflineData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    toast.info('تم مسح البيانات المحفوظة محلياً');
  }
}

// Singleton instance
export const offlineSyncService = new OfflineSyncService();

// Utility hooks and functions
export const useOfflineSync = () => {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = React.useState(offlineSyncService.getPendingSyncCount());

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Update pending count periodically
    const interval = setInterval(() => {
      setPendingCount(offlineSyncService.getPendingSyncCount());
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    isOffline,
    pendingCount,
    syncNow: () => offlineSyncService.syncOfflineTickets(),
    clearOffline: () => offlineSyncService.clearOfflineData()
  };
};

export default offlineSyncService;
