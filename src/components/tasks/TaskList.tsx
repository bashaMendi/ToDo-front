'use client';

import React, { memo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TaskCard } from './TaskCard';
import { TaskFilters } from './TaskFilters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Task, TaskFilters as TaskFiltersType } from '@/types';
import { apiClient } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { useSearchStore, useAuthStore } from '@/store';
import { usePerformance } from '@/hooks/usePerformance';

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
  const queryClient = useQueryClient();

  // Get authentication state
  const { isAuthenticated, isInitialized } = useAuthStore();

  // Get search query from global store
  const { searchQuery } = useSearchStore();

  // Combine filters with search query
  const memoizedFilters = React.useMemo(() => {
    const combinedFilters = {
      ...filters,
      search: searchQuery || undefined,
    };
    return combinedFilters;
  }, [filters, searchQuery]);

  // Log query key for debugging
  const queryKey = queryKeys.tasks.all(memoizedFilters);

  // Fetch tasks
  const {
    data: tasksResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKey,
    queryFn: () => {
      return apiClient.getTasks(memoizedFilters as TaskFiltersType);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - match useQueries.ts
    gcTime: 10 * 60 * 1000, // 10 minutes - match query-client.ts
    enabled: isInitialized, // Start loading as soon as auth is initialized
  });

  // Auto-load tasks if none are available
  useEffect(() => {
    if (isInitialized && !isLoading && (!tasksResponse?.data?.items || tasksResponse.data.items.length === 0)) {
      refetch();
    }
  }, [isInitialized, isLoading, tasksResponse?.data?.items, refetch]);

  // Memoized handlers
  const handleToggleStar = useCallback(async (taskId: string) => {
    try {
      // Find the task to check if it's currently starred
      const task = tasksResponse?.data?.items?.find(t => t.id === taskId);
      if (!task) {
        return;
      }

      // Optimistic update - immediately update the UI
      const updatedTasks = tasksResponse?.data?.items?.map(t => 
        t.id === taskId ? { ...t, isStarred: !t.isStarred } : t
      );
      
      // Update the query cache optimistically for all tasks queries
      if (tasksResponse?.data) {
        // Update current query
        queryClient.setQueryData(queryKey, {
          ...tasksResponse,
          data: {
            ...tasksResponse.data,
            items: updatedTasks
          }
        });
        
        // Update all other tasks queries with the same task
        queryClient.setQueriesData(
          { queryKey: ['tasks'] },
          (oldData: unknown) => {
            const data = oldData as { data?: { items?: Task[] } };
            if (data?.data?.items) {
              return {
                ...data,
                data: {
                  ...data.data,
                  items: data.data.items.map((t: Task) => 
                    t.id === taskId ? { ...t, isStarred: !t.isStarred } : t
                  )
                }
              };
            }
            return oldData;
          }
        );
      }

      // Call API to toggle star
      if (task.isStarred) {
        await apiClient.removeStar(taskId);
      } else {
        await apiClient.addStar(taskId);
      }

      // Invalidate all tasks queries to update all pages
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
    } catch {
      // Revert optimistic update on error
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  }, [tasksResponse, queryClient, queryKey]);



  // Filters are handled globally now

  // Search is handled globally by useSearch hook

  // Measure render performance
  React.useEffect(() => {
    const cleanup = measureRender();
    return cleanup;
  }, [measureRender, tasksResponse]);



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
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  const tasks = tasksResponse?.data?.items || [];

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
