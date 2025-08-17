import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import {
  TaskFilters,
  CreateTaskData,
  UpdateTaskData,
  ExportFormat,
} from '@/types';

// Task Queries
export const useTasks = (filters: TaskFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.all(filters),
    queryFn: () => apiClient.getTasks(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useTask = (id: string) => {
  return useQuery({
    queryKey: queryKeys.tasks.byId(id),
    queryFn: () => apiClient.getTask(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useStarredTasks = (filters: TaskFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.starred,
    queryFn: () => apiClient.getStarredTasks(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useMyTasks = (filters: TaskFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.mine(filters),
    queryFn: () => apiClient.getMyTasks(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Task Mutations
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskData) => apiClient.createTask(data),
    onSuccess: newTask => {
      // Invalidate tasks lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.mine() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.starred });

      // Add the new task to cache
      queryClient.setQueryData(
        queryKeys.tasks.byId(newTask.data!.id),
        newTask
      );
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      version,
    }: {
      id: string;
      data: UpdateTaskData;
      version?: number;
    }) => apiClient.updateTask(id, data, version),
    onSuccess: (updatedTask, variables) => {
      // Update the specific task in cache
      queryClient.setQueryData(queryKeys.tasks.byId(variables.id), updatedTask);

      // Invalidate tasks lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.mine() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.starred });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteTask(id),
    onSuccess: (_, taskId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.tasks.byId(taskId) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.mine() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.starred });
    },
  });
};

export const useDuplicateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.duplicateTask(id),
    onSuccess: duplicatedTask => {
      // Invalidate tasks lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.mine() });

      // Add the duplicated task to cache
      queryClient.setQueryData(
        queryKeys.tasks.byId(duplicatedTask.data!.id),
        duplicatedTask
      );
    },
  });
};

export const useAssignSelfToTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.assignSelfToTask(id),
    onSuccess: (_, taskId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byId(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.mine() });
    },
  });
};

// Star Mutations
export const useAddStar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => apiClient.addStar(taskId),
    onSuccess: (_, taskId) => {
      // Optimistically update the task
      queryClient.setQueryData(
        queryKeys.tasks.byId(taskId),
        (old: unknown) => {
          const oldData = old as Record<string, unknown>;
          return {
            ...oldData,
            data: { ...(oldData.data as Record<string, unknown>), isStarred: true },
          };
        }
      );

      // Invalidate starred tasks
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.starred });
    },
  });
};

export const useRemoveStar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => apiClient.removeStar(taskId),
    onSuccess: (_, taskId) => {
      // Optimistically update the task
      queryClient.setQueryData(
        queryKeys.tasks.byId(taskId),
        (old: unknown) => {
          const oldData = old as Record<string, unknown>;
          return {
            ...oldData,
            data: { ...(oldData.data as Record<string, unknown>), isStarred: false },
          };
        }
      );

      // Invalidate starred tasks
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.starred });
    },
  });
};

// Export Mutations
export const useExportMyTasks = () => {
  return useMutation({
    mutationFn: (format: ExportFormat) => apiClient.exportMyTasks(format),
  });
};

// Auth Queries
export const useMe = () => {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => apiClient.getCurrentUser(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Auth Mutations
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.login({ email, password }),
    onSuccess: () => {
      // Invalidate user data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
};

export const useSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => apiClient.signup({ name, email, password }),
    onSuccess: () => {
      // Invalidate user data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();
    },
  });
};



// Backward compatibility
export const useCurrentUser = useMe;
