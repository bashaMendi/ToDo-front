'use client';

import React, { memo, useCallback } from 'react';
import { TaskCard } from './TaskCard';
import { TaskFilters } from './TaskFilters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Task } from '@/types';
import { apiClient } from '@/lib/api';
import { useSearchStore, useAuthStore, useTaskStore } from '@/store';
import { usePerformance } from '@/hooks/usePerformance';
import { useTaskSync } from '@/hooks/useTaskSync';

interface TaskListProps {
  filters?: Record<string, unknown>;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onDuplicateTask?: (taskId: string) => void;
}

export const TaskList = memo<TaskListProps>(({
  filters = {},
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
}) => {
  // Performance monitoring
  const { measureRender } = usePerformance('TaskList');

  // Get authentication state
  const { isAuthenticated, isInitialized } = useAuthStore();

  // Get search query from global store
  const { searchQuery } = useSearchStore();

  // Use task sync hook
  useTaskSync({
    autoSyncOnMount: true,
    syncInterval: 30000, // Sync every 30 seconds
  });

  // Combine filters with search query
  const memoizedFilters = React.useMemo(() => {
    const combinedFilters = {
      ...filters,
      search: searchQuery || undefined,
    };
    return combinedFilters;
  }, [filters, searchQuery]);

  // Query key no longer needed since we use store

  // Get tasks from store (populated by sync)
  const { tasks, isLoading, error } = useTaskStore();

  // Tasks are now loaded via sync, no need for manual loading

  // Tasks are loaded via sync, no manual loading needed

  // Memoized handlers
  const handleToggleStar = useCallback(async (taskId: string) => {
    try {
      // Find the task to check if it's currently starred
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        return;
      }

      // Sync will handle the UI update after API call

      // Call API to toggle star
      if (task.isStarred) {
        await apiClient.removeStar(taskId);
      } else {
        await apiClient.addStar(taskId);
      }

    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  }, [tasks]);



  // Filters are handled globally now

  // Search is handled globally by useSearch hook

  // Measure render performance
  React.useEffect(() => {
    const cleanup = measureRender();
    return cleanup;
  }, [measureRender, tasks]);



  // Show loading only when fetching data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="טוען משימות..." />
      </div>
    );
  }

  // Show message if not authenticated but auth is initialized
  if (isInitialized && !isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">יש להתחבר כדי לראות משימות</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">שגיאה בטעינת המשימות</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  // Tasks are already available from store

  return (
    <div className="space-y-6">
      {/* TaskFilters - Hidden but functional */}
      <div style={{ display: 'none' }}>
        <TaskFilters
          filters={memoizedFilters}
          onFiltersChange={() => {}} // No-op since filters are handled globally
          onSearch={() => {}} // No-op since search is handled globally
        />
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">לא נמצאו משימות</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask || (() => {})}
              onDelete={onDeleteTask || (() => {})}
              onDuplicate={onDuplicateTask || (() => {})}
              onToggleStar={handleToggleStar}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TaskList.displayName = 'TaskList';
