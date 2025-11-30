/**
 * Mobile-specific types for Fabricator Pro Mobile App
 * These types are optimized for mobile use cases and sync with web app types
 */

import { Profile, Cut, CuttingPlan } from '@shared/fabricator';

/**
 * Mobile-optimized cutting plan with simplified structure
 */
export interface MobileCuttingPlan {
  id: string;
  projectName: string;
  projectCode?: string;
  profiles: MobileProfile[];
  status: 'pending' | 'in-progress' | 'completed' | 'paused';
  optimizedCuts: OptimizedCut[];
  totalProgress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mobile-optimized profile information
 */
export interface MobileProfile {
  id: string;
  name: string;
  material: 'aluminum' | 'upvc' | 'wood';
  color: string;
  width: number;
  costPerMeter: number;
}

/**
 * Optimized cut with completion tracking
 */
export interface OptimizedCut {
  id: string;
  length: number;
  angle: number;
  componentId: string;
  componentType?: string;
  profileId: string;
  stockLength: number;
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
}

/**
 * Mobile remnant with location and barcode
 */
export interface MobileRemnant {
  id: string;
  profileId: string;
  profileType: string;
  length: number;
  location: string;
  barcode?: string;
  scannedAt?: Date;
  scannedBy?: string;
  isAvailable: boolean;
}

/**
 * Barcode scan result
 */
export interface ScanResult {
  type: 'remnant' | 'profile' | 'project';
  data: any;
  timestamp: Date;
  barcode: string;
}

/**
 * Sync operation for offline queue
 */
export interface SyncOperation {
  id: string;
  type: 'update_remnant' | 'complete_cut' | 'update_job_status' | 'scan_remnant';
  payload: Record<string, any>;
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

/**
 * Network status
 */
export interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  type?: 'wifi' | 'cellular' | 'none';
}

/**
 * Job progress summary
 */
export interface JobProgress {
  jobId: string;
  totalCuts: number;
  completedCuts: number;
  progressPercentage: number;
  estimatedTimeRemaining?: number; // in minutes
  lastUpdated: Date;
}

