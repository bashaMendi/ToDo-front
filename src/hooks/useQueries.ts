import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/store';
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
    enabled: !!id && id.length > 0,
    // Use default staleTime from query client (5 minutes)
    // Use default gcTime from query client (10 minutes)
    retry: (failureCount, error) => {
      // Don't retry 404 errors (task not found)
      if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
        return false;
      }
      // Use default retry logic (3 attempts)
      return failureCount < 3;
    },
  });
};

export const useStarredTasks = () => {
  return useQuery({
    queryKey: queryKeys.tasks.starred,
    queryFn: () => apiClient.getStarredTasks(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useMyTasks = () => {
  return useQuery({
    queryKey: queryKeys.tasks.mine({}),
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
      // Invalidate ALL tasks queries (with and without filters)
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', 'all'],
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', 'mine'],
        exact: false 
      });
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
    
    // Optimistic update - עדכון מיידי לפני השרת
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.byId(id) });
      await queryClient.cancelQueries({ queryKey: ['tasks'], exact: false });
      
      // Snapshot the previous value
      const previousTask = queryClient.getQueryData(queryKeys.tasks.byId(id));
      const previousTasks = queryClient.getQueriesData({ queryKey: ['tasks'], exact: false });
      
      // Optimistically update the task
      queryClient.setQueryData(queryKeys.tasks.byId(id), (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const oldData = old as { data?: Record<string, unknown> };
        const updatedData = { ...oldData?.data, ...data };
        return {
          ...oldData,
          data: updatedData
        };
      });
      
      // Optimistically update all task lists
      queryClient.setQueriesData(
        { queryKey: ['tasks'], exact: false },
        (oldData: unknown) => {
          const data = oldData as { data?: { items?: Array<{ id: string }> } };
          if (!data?.data?.items) return oldData;
          
          const updatedItems = data.data.items.map((task) => 
            task.id === id ? { ...task, ...data } : task
          );
          
          return {
            ...data,
            data: { ...data.data, items: updatedItems }
          };
        }
      );
      
      // Return context with the snapshotted value
      return { previousTask, previousTasks };
    },
    
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.byId(variables.id), context.previousTask);
      }
      
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    
    // Always refetch after error or success
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byId(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['tasks'], exact: false });
    },
  });
};



export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteTask(id),
    onSuccess: (_, taskId) => {
      // Remove the specific task from cache immediately
      queryClient.removeQueries({ queryKey: queryKeys.tasks.byId(taskId) });

      // Update all task lists by removing the deleted task
      queryClient.setQueriesData(
        { queryKey: ['tasks'], exact: false },
        (oldData: unknown) => {
          const data = oldData as { data?: { items?: Array<{ id: string }> } };
          if (!data?.data?.items) return oldData;
          
          const filteredItems = data.data.items.filter((task) => task.id !== taskId);
          
          return {
            ...data,
            data: {
              ...data.data,
              items: filteredItems
            }
          };
        }
      );

      // Also update starred tasks if needed
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.starred },
        (oldData: unknown) => {
          const data = oldData as { data?: Array<{ id: string }> };
          if (!data?.data) return oldData;
          
          const filteredData = data.data.filter((task) => task.id !== taskId);
          
          return {
            ...data,
            data: filteredData
          };
        }
      );
    },
  });
};

export const useDuplicateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.duplicateTask(id),
    onSuccess: duplicatedTask => {
      // Invalidate ALL tasks queries (with and without filters)
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', 'all'],
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', 'mine'],
        exact: false 
      });

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
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', 'all'],
        exact: false 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', 'mine'],
        exact: false 
      });
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
    onSuccess: (response) => {
      // Update store state with user data
      if (response.data?.user) {
        const store = useAuthStore.getState();
        store.setUser(response.data.user);
        

      }
      
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
      confirmPassword,
    }: {
      name: string;
      email: string;
      password: string;
      confirmPassword: string;
    }) => apiClient.signup({ name, email, password, confirmPassword }),
    onSuccess: (response) => {
      // Update store state with user data
      if (response.data?.user) {
        const store = useAuthStore.getState();
        store.setUser(response.data.user);
      }
      
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
