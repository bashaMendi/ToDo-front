import { QueryClient } from '@tanstack/react-query';

// Create a function to get or create the query client
let queryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server-side: create a new client for each request
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });
  }

  // Client-side: create the client if it doesn't exist
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // Retry failed requests 2 times (reduced from 3)
          retry: 2,

          // Retry delay with exponential backoff (reduced max delay)
          retryDelay: attemptIndex => Math.min(500 * 2 ** attemptIndex, 10000),

          // Stale time - data is considered fresh for 5 minutes (increased from 1 minute)
          staleTime: 5 * 60 * 1000,

          // Cache time - keep data in cache for 10 minutes (increased from 2 minutes)
          gcTime: 10 * 60 * 1000,

          // Smart refetch on window focus - reduced frequency
          refetchOnWindowFocus: (query) => {
            // Don't refetch auth queries on window focus to prevent logout loops
            if (query.queryKey[0] === 'auth') {
              return false;
            }
            // Only refetch tasks queries every 5 minutes to reduce API calls
            const lastRefetch = query.state.dataUpdatedAt;
            if (lastRefetch && Date.now() - lastRefetch < 5 * 60 * 1000) {
              return false;
            }
            return true;
          },

          // Refetch on reconnect
          refetchOnReconnect: true,

          // Refetch on mount
          refetchOnMount: true,
        },
        mutations: {
          // Retry failed mutations once
          retry: 1,
        },
      },
    });
  }

  return queryClient;
}

// Query keys factory for better type safety
export const queryKeys = {
  // Auth queries
  auth: {
    me: ['auth', 'me'] as const,
  },

  // Task queries
  tasks: {
    all: (filters?: unknown) =>
      ['tasks', 'all', filters] as const,
    byId: (id: string) => ['tasks', 'byId', id] as const,
    starred: ['tasks', 'starred'] as const,
    mine: (filters?: unknown) =>
      ['tasks', 'mine', filters] as const,
  },

  // User queries
  users: {
    all: ['users', 'all'] as const,
    byId: (id: string) => ['users', 'byId', id] as const,
  },

  // Export queries
  export: {
    myTasks: (format: string) => ['export', 'myTasks', format] as const,
  },
} as const;
