/**
 * Hook for managing offline sync operations
 */
import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { offlineManager } from '../services/OfflineManager';
import { NetworkStatus } from '../types/mobile';

export const useOfflineSync = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true,
    isConnected: true,
  });
  const [queueLength, setQueueLength] = useState(0);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = state.isConnected ?? false;
      const isConnected = state.isInternetReachable ?? false;
      const type = state.type === 'wifi' ? 'wifi' : 
                   state.type === 'cellular' ? 'cellular' : 
                   'none';

      setNetworkStatus({
        isOnline,
        isConnected,
        type,
      });

      // Process queue when coming back online
      if (isOnline && isConnected) {
        offlineManager.processQueue();
      }
    });

    return () => unsubscribe();
  }, []);

  // Monitor sync queue
  useEffect(() => {
    setQueueLength(offlineManager.getQueueLength());
    const unsubscribe = offlineManager.subscribe((length) => {
      setQueueLength(length);
    });

    return unsubscribe;
  }, []);

  // Queue an operation
  const queueOperation = useCallback(async (
    type: 'update_remnant' | 'complete_cut' | 'update_job_status' | 'scan_remnant',
    payload: Record<string, any>
  ) => {
    return await offlineManager.queueOperation({ type, payload });
  }, []);

  // Manually trigger sync
  const syncNow = useCallback(async () => {
    if (networkStatus.isOnline && networkStatus.isConnected) {
      await offlineManager.processQueue();
    }
  }, [networkStatus]);

  return {
    networkStatus,
    queueLength,
    queueOperation,
    syncNow,
    isOnline: networkStatus.isOnline && networkStatus.isConnected,
  };
};

