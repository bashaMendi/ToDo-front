import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { SyncStorage } from '@/lib/sync-storage';
import type { SyncResponse, Task } from '@/types';

interface UseSyncOptions {
  onSyncComplete?: (data: SyncResponse) => void;
  onError?: (error: string) => void;
}

interface UseSyncReturn {
  sync: (since: string) => Promise<SyncResponse | null>;
  isLoading: boolean;
  error: string | null;
  lastSyncTimestamp: string | null;
  setLastSyncTimestamp: (timestamp: string) => void;
  clearError: () => void;
}

export function useSync(options: UseSyncOptions = {}): UseSyncReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSyncTimestampRef = useRef<string | null>(null);

  // Load last timestamp from localStorage on initialization
  useEffect(() => {
    const savedTimestamp = SyncStorage.getLastSyncTimestamp();
    if (savedTimestamp) {
      lastSyncTimestampRef.current = savedTimestamp;
    }
  }, []);

  const sync = useCallback(async (since: string): Promise<SyncResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.sync(since);
      
      if (response.data) {
        // Save currentTimestamp for next call
        lastSyncTimestampRef.current = response.data.currentTimestamp;
        SyncStorage.setLastSyncTimestamp(response.data.currentTimestamp);
        
        // Call completion callback
        options.onSyncComplete?.(response.data);
        
        return response.data;
      } else if (response.error) {
        const errorMessage = response.error.message || 'Sync error';
        setError(errorMessage);
        options.onError?.(errorMessage);
        return null;
      } else {
        const errorMessage = 'Unknown sync error';
        setError(errorMessage);
        options.onError?.(errorMessage);
        return null;
      }
    } catch (err) {
      const errorMessage = 'Network error during sync';
      setError(errorMessage);
      options.onError?.(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const setLastSyncTimestamp = useCallback((timestamp: string) => {
    lastSyncTimestampRef.current = timestamp;
    SyncStorage.setLastSyncTimestamp(timestamp);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sync,
    isLoading,
    error,
    lastSyncTimestamp: lastSyncTimestampRef.current,
    setLastSyncTimestamp,
    clearError,
  };
}

// Additional hook for updating tasks based on sync response
export function useTaskSync() {
  const [tasks, setTasksState] = useState<Task[]>([]);

  const applySyncData = useCallback((syncData: SyncResponse) => {
    setTasksState(currentTasks => {
      let updatedTasks = [...currentTasks];

      // Update existing tasks or add new ones
      syncData.updatedTasks.forEach(updatedTask => {
        const existingIndex = updatedTasks.findIndex(task => task.id === updatedTask.id);
        if (existingIndex >= 0) {
          // Update existing task
          updatedTasks[existingIndex] = updatedTask;
        } else {
          // Add new task
          updatedTasks.push(updatedTask);
        }
      });

      // Remove deleted tasks
      syncData.deletedTasks.forEach(deletedTask => {
        updatedTasks = updatedTasks.filter(task => task.id !== deletedTask.id);
      });

      return updatedTasks;
    });
  }, [setTasksState]);

  const setTasks = useCallback((newTasks: Task[]) => {
    setTasksState(newTasks);
  }, [setTasksState]);

  return {
    tasks,
    applySyncData,
    setTasks,
  };
}
