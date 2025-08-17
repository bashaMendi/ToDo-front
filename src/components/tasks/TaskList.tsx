'use client';

import React, { memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TaskCard } from './TaskCard';
import { TaskFilters } from './TaskFilters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Task, TaskFilters as TaskFiltersType } from '@/types';
import { apiClient } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/store';
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

  const { user } = useAuthStore();

  // Fetch tasks
  const {
    data: tasksResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tasks.all(filters),
    queryFn: () => apiClient.getTasks(filters as TaskFiltersType),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Memoized handlers
  const handleToggleStar = useCallback((taskId: string) => {
    // Implementation for toggling star
    console.log('Toggle star for task:', taskId);
  }, []);

  const handleViewHistory = useCallback((taskId: string) => {
    // Implementation for viewing history
    console.log('View history for task:', taskId);
  }, []);

  const handleFiltersChange = useCallback((newFilters: TaskFiltersType) => {
    // Implementation for filters change
    console.log('Filters changed:', newFilters);
  }, []);

  const handleSearch = useCallback((query: string) => {
    // Implementation for search
    console.log('Search query:', query);
  }, []);

  // Measure render performance
  React.useEffect(() => {
    const cleanup = measureRender();
    return cleanup;
  }, [measureRender, tasksResponse]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="טוען משימות..." />
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
      <TaskFilters
        filters={filters as TaskFiltersType}
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
      />

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
              onViewHistory={handleViewHistory}
            />
          ))}
        </div>
      )}
    </div>
  );
});

TaskList.displayName = 'TaskList';
