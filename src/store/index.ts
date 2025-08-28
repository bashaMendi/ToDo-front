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
} from '@/types';
import { apiClient } from '@/lib/api';
import { ensureWebSocketInitialized, resetWebSocketClient } from '@/lib/websocket';

// Auth store
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  sessionTimeout: NodeJS.Timeout | null;
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
              }).catch(() => {
                // Silent fail for WebSocket initialization
              });

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
            }).catch(() => {
              // Silent fail for WebSocket initialization
            });

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

          set({
            user: null,
            isAuthenticated: false,
            error: null,
            sessionTimeout: null,
            isLoggingOut: false,
          });
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            error: null,
            sessionTimeout: null,
            isLoggingOut: false,
          });
        }
      },

      checkAuth: async () => {
        const state = get();
        if (state.isLoading) {
          return;
        }
        
        set({ isLoading: true, error: null });
        
        if (state.user && !state.isInitialized) {
          set({ isAuthenticated: true });
        }
        
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
            }).catch(() => {
              // Silent fail for WebSocket initialization
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              isInitialized: true,
            });
          }
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            isInitialized: true,
          });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
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
        
        const timeout = setTimeout(() => {
          get().logout();
        }, expiryTime - Date.now());
        
        set({ sessionTimeout: timeout });
      },

      clearSessionTimeout: () => {
        const { sessionTimeout } = get();
        if (sessionTimeout) {
          clearTimeout(sessionTimeout);
          set({ sessionTimeout: null });
        }
      },

      getSessionStatus: () => {
        const { sessionTimeout } = get();
        if (!sessionTimeout) {
          return {
            sessionTimeout: null,
            timeLeft: 0,
            timeLeftMinutes: 0,
            isExpired: true,
          };
        }
        
        // Note: This is a simplified implementation since we don't store the expiry time
        // In a real implementation, you'd want to store the expiry timestamp separately
        const timeLeft = 0; // This would be calculated from stored expiry time
        const timeLeftMinutes = Math.max(0, Math.floor(timeLeft / 60000));
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
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  createTask: (taskData: CreateTaskData) => Promise<boolean>;
  updateTask: (id: string, taskData: UpdateTaskData) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  duplicateTask: (id: string) => Promise<boolean>;
  assignSelfToTask: (id: string) => Promise<boolean>;
  addStar: (id: string) => Promise<boolean>;
  removeStar: (id: string) => Promise<boolean>;
  exportTasks: (format: ExportFormat) => Promise<void>;
  syncTasks: (since?: string) => Promise<void>;
  
  // UI Actions
  setSelectedTask: (task: Task | null) => void;
  setModalState: (state: ModalState) => void;
  setFilters: (filters: TaskFilters) => void;
  clearError: () => void;
  
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

      fetchTasks: async (filters?: TaskFilters) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.getTasks(filters || get().filters);
          if (response.data) {
            set({ tasks: response.data.items, isLoading: false });
          } else {
            set({ error: response.error?.message || 'שגיאה בטעינת משימות', isLoading: false });
          }
        } catch {
          set({ error: 'שגיאת רשת בטעינת משימות', isLoading: false });
        }
      },

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
            await get().fetchTasks();
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
            await get().fetchTasks();
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
            await get().fetchTasks();
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
          const response = await apiClient.sync(since);
          if (response.data) {
            set({ tasks: response.data });
          }
        } catch {
          set({ error: 'שגיאה בסנכרון משימות' });
        }
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

      connectWebSocket: async () => {
        try {
          const client = await ensureWebSocketInitialized();
          return client.connect();
        } catch {
          // Silent fail for WebSocket connection
        }
      },

      setupWebSocketHandlers: () => {
        const { fetchTasks } = get();
        
        // Test event
        ensureWebSocketInitialized().then((client) => {
          client.on('test', (data: unknown) => {
            console.log('WebSocket test event:', data);
          });
        }).catch(() => {
          // Silent fail for WebSocket initialization
        });

        // Task created event
        ensureWebSocketInitialized().then((client) => {
          client.on('task.created', async (data: unknown) => {
            console.log('Task created:', data);
            await fetchTasks();
          });
        }).catch(() => {
          // Silent fail for WebSocket initialization
        });

        // Task updated event
        ensureWebSocketInitialized().then((client) => {
          client.on('task.updated', async (data: unknown) => {
            console.log('Task updated:', data);
            await fetchTasks();
          });
        }).catch(() => {
          // Silent fail for WebSocket initialization
        });

        // Task deleted event
        ensureWebSocketInitialized().then((client) => {
          client.on('task.deleted', async (data: unknown) => {
            console.log('Task deleted:', data);
            await fetchTasks();
          });
        }).catch(() => {
          // Silent fail for WebSocket initialization
        });

        // Task duplicated event
        ensureWebSocketInitialized().then((client) => {
          client.on('task.duplicated', async (data: unknown) => {
            console.log('Task duplicated:', data);
            await fetchTasks();
          });
        }).catch(() => {
          // Silent fail for WebSocket initialization
        });

        // Star added event
        ensureWebSocketInitialized().then((client) => {
          client.on('star.added', async (data: unknown) => {
            console.log('Star added:', data);
            await fetchTasks();
          });
        }).catch(() => {
          // Silent fail for WebSocket initialization
        });

        // Star removed event
        ensureWebSocketInitialized().then((client) => {
          client.on('star.removed', async (data: unknown) => {
            console.log('Star removed:', data);
            await fetchTasks();
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
let fetchTasksCallback: (() => Promise<void>) | null = null;

export const setupWebSocketHandlers = (fetchTasksFn: () => Promise<void>) => {
  // Store the callback for later use
  fetchTasksCallback = fetchTasksFn;
  
  // Clean up existing handlers
  cleanupFunctions.forEach(cleanup => cleanup());
  cleanupFunctions = [];

  // Test event handler
  ensureWebSocketInitialized().then((client) => {
    const cleanup = client.on('test', (data: unknown) => {
      console.log('WebSocket test event:', data);
    });
    cleanupFunctions.push(cleanup);
  }).catch(() => {
    // Silent fail for WebSocket initialization
  });

  // Task created event
  ensureWebSocketInitialized().then((client) => {
    const cleanup = client.on('task.created', async (data: unknown) => {
      console.log('Task created:', data);
      if (fetchTasksCallback) {
        await fetchTasksCallback();
      }
    });
    cleanupFunctions.push(cleanup);
  }).catch(() => {
    // Silent fail for WebSocket initialization
  });

  // Task updated event
  ensureWebSocketInitialized().then((client) => {
    const cleanup = client.on('task.updated', async (data: unknown) => {
      console.log('Task updated:', data);
      if (fetchTasksCallback) {
        await fetchTasksCallback();
      }
    });
    cleanupFunctions.push(cleanup);
  }).catch(() => {
    // Silent fail for WebSocket initialization
  });

  // Task deleted event
  ensureWebSocketInitialized().then((client) => {
    const cleanup = client.on('task.deleted', async (data: unknown) => {
      console.log('Task deleted:', data);
      if (fetchTasksCallback) {
        await fetchTasksCallback();
      }
    });
    cleanupFunctions.push(cleanup);
  }).catch(() => {
    // Silent fail for WebSocket initialization
  });

  // Task duplicated event
  ensureWebSocketInitialized().then((client) => {
    const cleanup = client.on('task.duplicated', async (data: unknown) => {
      console.log('Task duplicated:', data);
      if (fetchTasksCallback) {
        await fetchTasksCallback();
      }
    });
    cleanupFunctions.push(cleanup);
  }).catch(() => {
    // Silent fail for WebSocket initialization
  });

  // Star added event
  ensureWebSocketInitialized().then((client) => {
    const cleanup = client.on('star.added', async (data: unknown) => {
      console.log('Star added:', data);
      if (fetchTasksCallback) {
        await fetchTasksCallback();
      }
    });
    cleanupFunctions.push(cleanup);
  }).catch(() => {
    // Silent fail for WebSocket initialization
  });

  // Star removed event
  ensureWebSocketInitialized().then((client) => {
    const cleanup = client.on('star.removed', async (data: unknown) => {
      console.log('Star removed:', data);
      if (fetchTasksCallback) {
        await fetchTasksCallback();
      }
    });
    cleanupFunctions.push(cleanup);
  }).catch(() => {
    // Silent fail for WebSocket initialization
  });
};
