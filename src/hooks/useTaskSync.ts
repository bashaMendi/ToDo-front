import { useEffect, useCallback } from 'react';
import { useTaskStore } from '@/store';
import { SyncStorage } from '@/lib/sync-storage';

interface UseTaskSyncOptions {
  autoSyncOnMount?: boolean;
  syncInterval?: number; // milliseconds
}

export function useTaskSync(options: UseTaskSyncOptions = {}) {
  const { autoSyncOnMount = true, syncInterval } = options;
  const { syncTasks, applySyncData } = useTaskStore();

  // Automatic sync on mount
  useEffect(() => {
    if (autoSyncOnMount) {
      const performInitialSync = async () => {
        try {
          await syncTasks();
        } catch (error) {
          console.warn('Initial sync failed:', error);
        }
      };

      // Wait a bit before initial sync
      const timeoutId = setTimeout(performInitialSync, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [autoSyncOnMount, syncTasks]);

  // Periodic sync
  useEffect(() => {
    if (syncInterval && syncInterval > 0) {
      const intervalId = setInterval(async () => {
        try {
          await syncTasks();
        } catch (error) {
          console.warn('Periodic sync failed:', error);
        }
      }, syncInterval);

      return () => clearInterval(intervalId);
    }
  }, [syncInterval, syncTasks]);

  // Manual sync function
  const manualSync = useCallback(async () => {
    try {
      return await syncTasks();
    } catch (error) {
      console.error('Manual sync failed:', error);
      return false;
    }
  }, [syncTasks]);

  // Get last timestamp function
  const getLastSyncTimestamp = useCallback(() => {
    return SyncStorage.getLastSyncTimestamp();
  }, []);

  // Reset timestamp function
  const resetSyncTimestamp = useCallback(() => {
    SyncStorage.clearLastSyncTimestamp();
  }, []);

  return {
    manualSync,
    getLastSyncTimestamp,
    resetSyncTimestamp,
    applySyncData,
  };
}
