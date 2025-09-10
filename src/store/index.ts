import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  User,
  Task,
  TaskFilters,
  ModalState,
  NavigationItem,
  CreateTaskData,
  UpdateTaskData,
  ExportFormat,
  SyncResponse,
} from '@/types';
import { apiClient } from '@/lib/api';
import { ensureWebSocketInitialized, resetWebSocketClient } from '@/lib/websocket';
import { SyncStorage } from '@/lib/sync-storage';
import { smartSessionManager } from '@/lib/session-manager';

// Auth store
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  sessionTimeout: NodeJS.Timeout | null;
  sessionExpiryTime: number | null; // Add this field to store actual expiry time
  isInitialized: boolean;
  isLoggingOut: boolean;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, confirmPassword: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
  refreshSession: () => Promise<boolean>;
  setupSessionTimeout: (expiryTime?: number) => void;
  clearSessionTimeout: () => void;
  getSessionStatus: () => {
    sessionTimeout: NodeJS.Timeout | null;
    timeLeft: number;
    timeLeftMinutes: number;
    isExpired: boolean;
  };
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      sessionTimeout: null,
      sessionExpiryTime: null,
      isInitialized: false,
      isLoggingOut: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.login({ email, password });
          
          if (response.data) {
            const user = response.data.user;
            
            if (user && user.id) {
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                isInitialized: true,
              });

              get().setupSessionTimeout(response.sessionExpiry);

              ensureWebSocketInitialized().then((client) => {
                client.connect().catch(() => {
                  // Silent fail for WebSocket connection
                });
                client.joinUserRoom(user.id);
                
                // Sync tasks when reconnecting to WebSocket
                setTimeout(async () => {
                  try {
                    const { useTaskStore } = await import('@/store');
                    await useTaskStore.getState().syncTasks();
                  } catch {
                    // Silent fail for sync
                  }
                }, 1000);
              }).catch(() => {
                // Silent fail for WebSocket initialization
              });

              // Auto-load tasks after successful login
              setTimeout(async () => {
                try {
                  // Direct API call to load tasks instead of dynamic import
                  const response = await apiClient.getTasks();
                  if (response.data) {
                    // Update task store directly
                    import('@/store').then(({ useTaskStore }) => {
                      useTaskStore.getState().setTasks(response.data.items);
                    });
                  }
                } catch (error) {
                  // Silent fail - tasks will be loaded by components
                }
              }, 200);

              return true;
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: 'נתוני משתמש לא תקינים',
                isInitialized: true,
              });
              return false;
            }
          } else if (response.error) {
            const errorMessage = response.error.message || 'שגיאה בהתחברות';
            set({ 
              isLoading: false, 
              error: errorMessage,
              isInitialized: true 
            });
            return false;
          } else {
            set({ 
              isLoading: false, 
              error: 'שגיאה לא ידועה בהתחברות',
              isInitialized: true 
            });
            return false;
          }
        } catch {
          set({ 
            isLoading: false, 
            error: 'שגיאת רשת - נסה שוב',
            isInitialized: true 
          });
          return false;
        }
      },

      signup: async (name: string, email: string, password: string, confirmPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.signup({ name, email, password, confirmPassword });
          if (response.data) {
            const { user } = response.data;
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              isInitialized: true,
            });

            get().setupSessionTimeout(response.sessionExpiry);

            ensureWebSocketInitialized().then((client) => {
              client.connect().catch(() => {
                // Silent fail for WebSocket connection
              });
              client.joinUserRoom(user.id);
              
              // Sync tasks when reconnecting to WebSocket
              setTimeout(async () => {
                try {
                  const { useTaskStore } = await import('@/store');
                  await useTaskStore.getState().syncTasks();
                } catch {
                  // Silent fail for sync
                }
              }, 1000);
            }).catch(() => {
              // Silent fail for WebSocket initialization
            });

            // Auto-load tasks after successful signup
            setTimeout(async () => {
              try {
                // Direct API call to load tasks instead of dynamic import
                const response = await apiClient.getTasks();
                if (response.data) {
                  // Update task store directly
                  import('@/store').then(({ useTaskStore }) => {
                    useTaskStore.getState().setTasks(response.data.items);
                  });
                }
              } catch (error) {
                // Silent fail - tasks will be loaded by components
              }
            }, 200);

            return true;
          } else {
            const errorMessage = response.error?.message || 'שגיאה ברישום';
            set({ 
              isLoading: false, 
              error: errorMessage,
              isInitialized: true 
            });
            return false;
          }
        } catch {
          set({ 
            isLoading: false, 
            error: 'שגיאת רשת - נסה שוב',
            isInitialized: true 
          });
          return false;
        }
      },

      logout: async () => {
        const currentUser = get().user;
        const currentState = get();
        
        if (currentState.isLoggingOut) {
          return;
        }
        
        set({ isLoggingOut: true });
        
        try {
          if (currentState.isAuthenticated || currentUser) {
            try {
              await apiClient.logout();
            } catch {
              // Ignore logout errors
            }
          }

          if (currentUser) {
            ensureWebSocketInitialized().then((client) => {
              client.leaveUserRoom(currentUser.id);
              client.disconnect();
            }).catch(() => {
              // Silent fail for WebSocket cleanup
            });
          }

          resetWebSocketClient();
          get().clearSessionTimeout();
          smartSessionManager.cleanup();

          // Clear any cached data
          if (typeof window !== 'undefined') {
            // Clear localStorage sync timestamp
            localStorage.removeItem('lastSyncTimestamp');
            // Clear any other cached data if needed
          }

          set({
            user: null,
            isAuthenticated: false,
            error: null,
            sessionTimeout: null,
            sessionExpiryTime: null,
            isLoggingOut: false,
          });
        } catch {
          // Clear any cached data even on error
          smartSessionManager.cleanup();
          if (typeof window !== 'undefined') {
            localStorage.removeItem('lastSyncTimestamp');
          }

          set({
            user: null,
            isAuthenticated: false,
            error: null,
            sessionTimeout: null,
            sessionExpiryTime: null,
            isLoggingOut: false,
          });
        }
      },

      checkAuth: async () => {
        const state = get();
        if (state.isLoading || state.isLoggingOut) {
          return;
        }
        
        set({ isLoading: true, error: null, isInitialized: true });
        
        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          set({ 
            isLoading: false, 
            isInitialized: true,
            isAuthenticated: false,
            user: null 
          });
        }, 10000); // 10 second timeout
        
        if (state.user && !state.isAuthenticated) {
          set({ isAuthenticated: true });
        }
        
        // Simplified retry logic - reduced from 3 to 1 retry
        let retryCount = 0;
        const maxRetries = 1; // Reduced from 2 to 1
        const retryDelay = 1500; // Increased from 1000ms to 1500ms
        
        const attemptAuthCheck = async (): Promise<boolean> => {
          try {
            const response = await apiClient.getCurrentUser();
            
            if (response.data) {
              const user = response.data;
              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                isInitialized: true,
              });

              get().setupSessionTimeout(response.sessionExpiry);

              ensureWebSocketInitialized().then((client) => {
                client.connect().catch(() => {
                  // Silent fail for WebSocket connection
                });
                client.joinUserRoom(user.id);
                
                // Sync tasks when reconnecting to WebSocket
                setTimeout(async () => {
                  try {
                    const { useTaskStore } = await import('@/store');
                    await useTaskStore.getState().syncTasks();
                  } catch {
                    // Silent fail for sync
                  }
                }, 1000);
              }).catch(() => {
                // Silent fail for WebSocket initialization
              });
              
              return true; // Success
            } else {
              // Only logout on clear 401 errors
              if (response.error?.code === 401) {
                clearTimeout(timeoutId);
                set({
                  user: null,
                  isAuthenticated: false,
                  isLoading: false,
                  error: null,
                  isInitialized: true,
                  sessionTimeout: null,
                  sessionExpiryTime: null,
                });
                return true; // Don't retry 401 errors
              } else {
                // Keep current state if no clear authentication error
                clearTimeout(timeoutId);
                set({
                  isLoading: false,
                  isInitialized: true,
                });
                return false; // Retry for other errors
              }
            }
          } catch (error) {
            // Keep current state on network errors
            clearTimeout(timeoutId);
            set({
              isLoading: false,
              isInitialized: true,
            });
            return false; // Retry for network errors
          }
        };
        
        // Attempt auth check with retries
        while (retryCount <= maxRetries) {
          const success = await attemptAuthCheck();
          if (success) {
            return; // Auth check succeeded
          }
          
          retryCount++;
          if (retryCount <= maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            // Don't reset loading state for retry to prevent UI flicker
            set({ error: null });
          }
        }
        
        // All retries failed - keep current state
        clearTimeout(timeoutId);
        set({
          isLoading: false,
          isInitialized: true,
        });
      },

      setUser: (user: User | null) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          isInitialized: true,
          isLoading: false,
          error: null
        });
      },

      clearError: () => {
        set({ error: null });
      },

      refreshSession: async () => {
        try {
          const response = await apiClient.getCurrentUser();
          
          if (response.data) {
            const user = response.data;
            set({
              user,
              isAuthenticated: true,
              error: null,
            });

            get().setupSessionTimeout(response.sessionExpiry);
            return true;
          } else {
            set({
              user: null,
              isAuthenticated: false,
              error: response.error?.message || 'שגיאה ברענון הסשן',
            });
            return false;
          }
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            error: 'שגיאת רשת ברענון הסשן',
          });
          return false;
        }
      },

      setupSessionTimeout: (expiryTime?: number) => {
        get().clearSessionTimeout();
        
        if (!expiryTime) return;
        
        // Validate expiry time - prevent negative timeouts
        const timeUntilExpiry = expiryTime - Date.now();
        
        if (timeUntilExpiry <= 0) {
          // Session already expired, logout immediately
          get().logout();
          return;
        }
        
        const timeout = setTimeout(() => {
          get().logout();
        }, timeUntilExpiry);
        
        set({ 
          sessionTimeout: timeout,
          sessionExpiryTime: expiryTime 
        });
      },

      clearSessionTimeout: () => {
        const { sessionTimeout } = get();
        if (sessionTimeout) {
          clearTimeout(sessionTimeout);
          set({ 
            sessionTimeout: null,
            sessionExpiryTime: null 
          });
        }
      },

      getSessionStatus: () => {
        const { sessionTimeout, sessionExpiryTime } = get();
        if (!sessionTimeout || !sessionExpiryTime) {
          return {
            sessionTimeout: null,
            timeLeft: 0,
            timeLeftMinutes: 0,
            isExpired: false, // Don't expire if no timeout is set
          };
        }
        
        // Calculate actual time left based on stored expiry time
        const now = Date.now();
        const timeLeft = Math.max(0, sessionExpiryTime - now);
        const timeLeftMinutes = Math.floor(timeLeft / 60000);
        const isExpired = timeLeft <= 0;
        
        return {
          sessionTimeout,
          timeLeft,
          timeLeftMinutes,
          isExpired,
        };
      },
    }),
    {
      name: 'auth-store',
    }
  ));

// Task store
interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  filters: TaskFilters;
  selectedTask: Task | null;
  modalState: ModalState;

  // Actions
  createTask: (taskData: CreateTaskData) => Promise<boolean>;
  updateTask: (id: string, taskData: UpdateTaskData) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  duplicateTask: (id: string) => Promise<boolean>;
  assignSelfToTask: (id: string) => Promise<boolean>;
  addStar: (id: string) => Promise<boolean>;
  removeStar: (id: string) => Promise<boolean>;
  exportTasks: (format: ExportFormat) => Promise<void>;
  syncTasks: (since?: string) => Promise<boolean>;
  applySyncData: (syncData: SyncResponse) => void;
  
  // UI Actions
  setSelectedTask: (task: Task | null) => void;
  setModalState: (state: ModalState) => void;
  setFilters: (filters: TaskFilters) => void;
  clearError: () => void;
  setTasks: (tasks: Task[]) => void;
  
  // WebSocket Actions
  connectWebSocket: () => Promise<void>;
  setupWebSocketHandlers: () => void;
}

export const useTaskStore = create<TaskState>()(
  devtools(
    (set, get) => ({
      tasks: [],
      isLoading: false,
      error: null,
      filters: {
        search: '',
        status: 'all',
        priority: 'all',
        assignedTo: 'all',
        createdBy: 'all',
        dateRange: 'all',
        starred: false,
      },
      selectedTask: null,
      modalState: { isOpen: false, type: null },


      createTask: async (taskData: CreateTaskData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.createTask(taskData);
          if (response.data) {
            set({ tasks: [...get().tasks, response.data], isLoading: false });
            return true;
          } else {
            set({ error: response.error?.message || 'שגיאה ביצירת משימה', isLoading: false });
            return false;
          }
        } catch {
          set({ error: 'שגיאת רשת ביצירת משימה', isLoading: false });
          return false;
        }
      },

      updateTask: async (id: string, taskData: UpdateTaskData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.updateTask(id, taskData);
          if (response.data) {
            set({
              tasks: get().tasks.map(task => 
                task.id === id ? response.data! : task
              ),
              isLoading: false
            });
            return true;
          } else {
            set({ error: response.error?.message || 'שגיאה בעדכון משימה', isLoading: false });
            return false;
          }
        } catch {
          set({ error: 'שגיאת רשת בעדכון משימה', isLoading: false });
          return false;
        }
      },

      deleteTask: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.deleteTask(id);
          if (response.data !== undefined) {
            set({
              tasks: get().tasks.filter(task => task.id !== id),
              isLoading: false
            });
            return true;
          } else {
            set({ error: response.error?.message || 'שגיאה במחיקת משימה', isLoading: false });
            return false;
          }
        } catch {
          set({ error: 'שגיאת רשת במחיקת משימה', isLoading: false });
          return false;
        }
      },

      duplicateTask: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.duplicateTask(id);
          if (response.data) {
            set({ tasks: [...get().tasks, response.data], isLoading: false });
            return true;
          } else {
            set({ error: response.error?.message || 'שגיאה בשכפול משימה', isLoading: false });
            return false;
          }
        } catch {
          set({ error: 'שגיאת רשת בשכפול משימה', isLoading: false });
          return false;
        }
      },

      assignSelfToTask: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.assignSelfToTask(id);
          if (response.data !== undefined) {
            // For void responses, we just need to refresh the task list
            await get().syncTasks();
            set({ isLoading: false });
            return true;
          } else {
            set({ error: response.error?.message || 'שגיאה בהקצאת משימה', isLoading: false });
            return false;
          }
        } catch {
          set({ error: 'שגיאת רשת בהקצאת משימה', isLoading: false });
          return false;
        }
      },

      addStar: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.addStar(id);
          if (response.data !== undefined) {
            // For void responses, we just need to refresh the task list
            await get().syncTasks();
            set({ isLoading: false });
            return true;
          } else {
            set({ error: response.error?.message || 'שגיאה בהוספת כוכב', isLoading: false });
            return false;
          }
        } catch {
          set({ error: 'שגיאת רשת בהוספת כוכב', isLoading: false });
          return false;
        }
      },

      removeStar: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.removeStar(id);
          if (response.data !== undefined) {
            // For void responses, we just need to refresh the task list
            await get().syncTasks();
            set({ isLoading: false });
            return true;
          } else {
            set({ error: response.error?.message || 'שגיאה בהסרת כוכב', isLoading: false });
            return false;
          }
        } catch {
          set({ error: 'שגיאת רשת בהסרת כוכב', isLoading: false });
          return false;
        }
      },

      exportTasks: async (format: ExportFormat) => {
        try {
          await apiClient.exportMyTasks(format);
        } catch {
          set({ error: 'שגיאה בייצוא משימות' });
        }
      },

      syncTasks: async (since?: string) => {
        try {
          const syncSince = since || SyncStorage.getInitialSyncTimestamp();
          const response = await apiClient.sync(syncSince);
          
          if (response.data) {
            // Save new timestamp
            SyncStorage.setLastSyncTimestamp(response.data.currentTimestamp);
            
            // Update tasks
            get().applySyncData(response.data);
            return true;
          } else {
            set({ error: response.error?.message || 'Task sync error' });
            return false;
          }
        } catch {
          set({ error: 'Network error during task sync' });
          return false;
        }
      },

      applySyncData: (syncData: SyncResponse) => {
        set((state) => {
          let updatedTasks = [...state.tasks];

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

          return { tasks: updatedTasks };
        });
      },

      setSelectedTask: (task: Task | null) => {
        set({ selectedTask: task });
      },

      setModalState: (state: ModalState) => {
        set({ modalState: state });
      },

      setFilters: (filters: TaskFilters) => {
        set({ filters });
      },

      clearError: () => {
        set({ error: null });
      },

      setTasks: (tasks: Task[]) => {
        set({ tasks });
      },

      connectWebSocket: async () => {
        try {
          const client = await ensureWebSocketInitialized();
          return client.connect();
        } catch {
          // Silent fail for WebSocket connection
        }
      },

      setupWebSocketHandlers: () => {
        const { syncTasks } = get();
        
                 // Test event
         ensureWebSocketInitialized().then((client) => {
           client.on('test', (data: unknown) => {
             // WebSocket test event received
           });
         }).catch(() => {
          // Silent fail for WebSocket initialization
        });

                 // Task created event
         ensureWebSocketInitialized().then((client) => {
           client.on('task.created', async (data: unknown) => {
             const { useTaskStore } = await import('@/store');
             await useTaskStore.getState().syncTasks();
           });
         }).catch(() => {
           // Silent fail for WebSocket initialization
         });

                 // Task updated event
         ensureWebSocketInitialized().then((client) => {
           client.on('task.updated', async (data: unknown) => {
             const { useTaskStore } = await import('@/store');
             await useTaskStore.getState().syncTasks();
           });
         }).catch(() => {
           // Silent fail for WebSocket initialization
         });

                 // Task deleted event
         ensureWebSocketInitialized().then((client) => {
           client.on('task.deleted', async (data: unknown) => {
             const { useTaskStore } = await import('@/store');
             await useTaskStore.getState().syncTasks();
           });
         }).catch(() => {
           // Silent fail for WebSocket initialization
         });

                 // Task duplicated event
         ensureWebSocketInitialized().then((client) => {
           client.on('task.duplicated', async (data: unknown) => {
             const { useTaskStore } = await import('@/store');
             await useTaskStore.getState().syncTasks();
           });
         }).catch(() => {
           // Silent fail for WebSocket initialization
         });

                 // Star added event
         ensureWebSocketInitialized().then((client) => {
           client.on('star.added', async (data: unknown) => {
             const { useTaskStore } = await import('@/store');
             await useTaskStore.getState().syncTasks();
           });
         }).catch(() => {
           // Silent fail for WebSocket initialization
         });

                 // Star removed event
         ensureWebSocketInitialized().then((client) => {
           client.on('star.removed', async (data: unknown) => {
             const { useTaskStore } = await import('@/store');
             await useTaskStore.getState().syncTasks();
           });
         }).catch(() => {
           // Silent fail for WebSocket initialization
         });
      },
    }),
    {
      name: 'task-store',
    }
  ));

// UI store
interface UIStoreState {
  navigation: NavigationItem[];
  currentPage: string;
  isLoading: boolean;
  error: string | null;
  modal: ModalState;

  // Actions
  setCurrentPage: (page: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  openModal: (type: ModalState['type'], taskId?: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStoreState>()(
  devtools(
    (set) => ({
      navigation: [
        { id: 'home', label: 'דף הבית', href: '/', icon: 'home' },
        { id: 'mine', label: 'המשימות שלי', href: '/mine', icon: 'user' },
        { id: 'starred', label: 'סומנו בכוכב', href: '/starred', icon: 'star' },
      ],
      currentPage: 'home',
      isLoading: false,
      error: null,
      modal: { isOpen: false, type: null },

      setCurrentPage: (page: string) => {
        set({ currentPage: page });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      openModal: (type: ModalState['type'], taskId?: string) => {
        set({ modal: { isOpen: true, type, taskId } });
      },

      closeModal: () => {
        set({ modal: { isOpen: false, type: null, taskId: undefined } });
      },
    }),
    {
      name: 'ui-store',
    }
  ));

// Search store
export const useSearchStore = create<{
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
}>((set) => ({
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  clearSearch: () => set({ searchQuery: '' }),
}));

// WebSocket event handlers with proper cleanup
let cleanupFunctions: (() => void)[] = [];
let syncTasksCallback: (() => Promise<void>) | null = null;

export const setupWebSocketHandlers = (syncTasksFn: () => Promise<void>) => {
  // Store the callback for later use
  syncTasksCallback = syncTasksFn;
  
  // Clean up existing handlers
  cleanupFunctions.forEach(cleanup => cleanup());
  cleanupFunctions = [];

     // Test event handler
   ensureWebSocketInitialized().then((client) => {
     const cleanup = client.on('test', (data: unknown) => {
       // WebSocket test event received
     });
     cleanupFunctions.push(cleanup);
   }).catch(() => {
    // Silent fail for WebSocket initialization
  });

     // Task created event
   ensureWebSocketInitialized().then((client) => {
     const cleanup = client.on('task.created', async (data: unknown) => {
       if (syncTasksCallback) {
         await syncTasksCallback();
       }
     });
     cleanupFunctions.push(cleanup);
   }).catch(() => {
    // Silent fail for WebSocket initialization
  });

     // Task updated event
   ensureWebSocketInitialized().then((client) => {
     const cleanup = client.on('task.updated', async (data: unknown) => {
       if (syncTasksCallback) {
         await syncTasksCallback();
       }
     });
     cleanupFunctions.push(cleanup);
   }).catch(() => {
    // Silent fail for WebSocket initialization
  });

     // Task deleted event
   ensureWebSocketInitialized().then((client) => {
     const cleanup = client.on('task.deleted', async (data: unknown) => {
       if (syncTasksCallback) {
         await syncTasksCallback();
       }
     });
     cleanupFunctions.push(cleanup);
   }).catch(() => {
    // Silent fail for WebSocket initialization
  });

     // Task duplicated event
   ensureWebSocketInitialized().then((client) => {
     const cleanup = client.on('task.duplicated', async (data: unknown) => {
       if (syncTasksCallback) {
         await syncTasksCallback();
       }
     });
     cleanupFunctions.push(cleanup);
   }).catch(() => {
    // Silent fail for WebSocket initialization
  });

     // Star added event
   ensureWebSocketInitialized().then((client) => {
     const cleanup = client.on('star.added', async (data: unknown) => {
       if (syncTasksCallback) {
         await syncTasksCallback();
       }
     });
     cleanupFunctions.push(cleanup);
   }).catch(() => {
    // Silent fail for WebSocket initialization
  });

     // Star removed event
   ensureWebSocketInitialized().then((client) => {
     const cleanup = client.on('star.removed', async (data: unknown) => {
       if (syncTasksCallback) {
         await syncTasksCallback();
       }
     });
     cleanupFunctions.push(cleanup);
   }).catch(() => {
    // Silent fail for WebSocket initialization
  });
};
