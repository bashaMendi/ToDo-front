import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  User,
  Task,
  TaskFilters,
  ModalState,
  UIState,
  NavigationItem,
} from '@/types';
import { apiClient } from '@/lib/api';
import { wsClient } from '@/lib/websocket';

// Auth store
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isLoading: false,
        isAuthenticated: false,

        login: async (email: string, password: string) => {
          set({ isLoading: true });
          try {
            const response = await apiClient.login({ email, password });
            if (response.data) {
              set({
                user: response.data.user,
                isAuthenticated: true,
                isLoading: false,
              });

              // Connect to WebSocket and join user room
              wsClient.connect();
              wsClient.joinUserRoom(response.data.user.id);

              return true;
            } else {
              set({ isLoading: false });
              return false;
            }
          } catch (_error) {
            set({ isLoading: false });
            return false;
          }
        },

        signup: async (name: string, email: string, password: string) => {
          set({ isLoading: true });
          try {
            const response = await apiClient.signup({ name, email, password });
            if (response.data) {
              set({
                user: response.data.user,
                isAuthenticated: true,
                isLoading: false,
              });

              // Connect to WebSocket and join user room
              wsClient.connect();
              wsClient.joinUserRoom(response.data.user.id);

              return true;
            } else {
              set({ isLoading: false });
              return false;
            }
          } catch (_error) {
            set({ isLoading: false });
            return false;
          }
        },

        logout: async () => {
          try {
            await apiClient.logout();
          } catch (_error) {
            console.error('Logout error:', _error);
          } finally {
            // Disconnect from WebSocket
            const user = get().user;
            if (user) {
              wsClient.leaveUserRoom(user.id);
            }
            wsClient.disconnect();

            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        },

        checkAuth: async () => {
          set({ isLoading: true });
          try {
            const response = await apiClient.getCurrentUser();
            if (response.data) {
              set({
                user: response.data,
                isAuthenticated: true,
                isLoading: false,
              });

              // Connect to WebSocket and join user room
              wsClient.connect();
              wsClient.joinUserRoom(response.data.id);
            } else {
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
            }
          } catch (_error) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        },

        setUser: (user: User | null) => {
          set({
            user,
            isAuthenticated: !!user,
          });
        },
      }),
      {
        name: 'auth-storage',
        partialize: state => ({ user: state.user }),
      }
    )
  )
);

// Tasks store
interface TasksState {
  tasks: Task[];
  starredTasks: Task[];
  myTasks: Task[];
  currentFilters: TaskFilters;
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;

  // Actions
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  fetchStarredTasks: () => Promise<void>;
  fetchMyTasks: () => Promise<void>;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  toggleStar: (taskId: string) => void;
  setFilters: (filters: TaskFilters) => void;
  resetTasks: () => void;
}

export const useTasksStore = create<TasksState>()(
  devtools((set, get) => ({
    tasks: [],
    starredTasks: [],
    myTasks: [],
    currentFilters: {
      context: 'all',
      page: 1,
      limit: 20,
      sort: 'updatedAt:desc',
    },
    isLoading: false,
    hasMore: false,
    currentPage: 1,

    fetchTasks: async (filters?: TaskFilters) => {
      const currentFilters = filters || get().currentFilters;
      set({ isLoading: true });

      try {
        const response = await apiClient.getTasks(currentFilters);
        if (response.data) {
          set({
            tasks: response.data.items,
            hasMore: response.data.hasMore,
            currentPage: response.data.page,
            currentFilters,
            isLoading: false,
          });
        }
      } catch (_error) {
        set({ isLoading: false });
      }
    },

    fetchStarredTasks: async () => {
      try {
        const response = await apiClient.getStarredTasks();
        if (response.data) {
          set({ starredTasks: response.data });
        }
      } catch (_error) {
        console.error('Error fetching starred tasks:', _error);
      }
    },

    fetchMyTasks: async () => {
      try {
        const response = await apiClient.getMyTasks();
        if (response.data) {
          set({
            myTasks: response.data.items,
            hasMore: response.data.hasMore,
          });
        }
      } catch (_error) {
        console.error('Error fetching my tasks:', _error);
      }
    },

    addTask: (task: Task) => {
      set(state => ({
        tasks: [task, ...state.tasks],
      }));
    },

    updateTask: (taskId: string, updates: Partial<Task>) => {
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        ),
        starredTasks: state.starredTasks.map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        ),
        myTasks: state.myTasks.map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        ),
      }));
    },

    removeTask: (taskId: string) => {
      set(state => ({
        tasks: state.tasks.filter(task => task.id !== taskId),
        starredTasks: state.starredTasks.filter(task => task.id !== taskId),
        myTasks: state.myTasks.filter(task => task.id !== taskId),
      }));
    },

    toggleStar: (taskId: string) => {
      set(state => {
        const updateTask = (task: Task) =>
          task.id === taskId ? { ...task, isStarred: !task.isStarred } : task;

        return {
          tasks: state.tasks.map(updateTask),
          starredTasks: state.starredTasks.map(updateTask),
          myTasks: state.myTasks.map(updateTask),
        };
      });
    },

    setFilters: (filters: TaskFilters) => {
      set({ currentFilters: filters });
    },

    resetTasks: () => {
      set({
        tasks: [],
        starredTasks: [],
        myTasks: [],
        currentFilters: {
          context: 'all',
          page: 1,
          limit: 20,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        },
        isLoading: false,
        hasMore: false,
        currentPage: 1,
      });
    },
  }))
);

// UI store
interface UIStoreState {
  modal: ModalState;
  ui: UIState;
  navigation: NavigationItem;

  // Actions
  openModal: (type: ModalState['type'], taskId?: string) => void;
  closeModal: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  setNavigation: (item: NavigationItem) => void;
  clearUI: () => void;
}

export const useUIStore = create<UIStoreState>()(
  devtools(set => ({
    modal: { isOpen: false, type: null },
    ui: { isLoading: false, error: null, success: null },
    navigation: 'home',

    openModal: (type: ModalState['type'], taskId?: string) => {
      set({ modal: { isOpen: true, type, taskId } });
    },

    closeModal: () => {
      set({ modal: { isOpen: false, type: null, taskId: undefined } });
    },

    setLoading: (isLoading: boolean) => {
      set(state => ({
        ui: { ...state.ui, isLoading },
      }));
    },

    setError: (error: string | null) => {
      set(state => ({
        ui: { ...state.ui, error, success: null },
      }));
    },

    setSuccess: (success: string | null) => {
      set(state => ({
        ui: { ...state.ui, success, error: null },
      }));
    },

    setNavigation: (navigation: NavigationItem) => {
      set({ navigation });
    },

    clearUI: () => {
      set({
        ui: { isLoading: false, error: null, success: null },
      });
    },
  }))
);

// WebSocket event handlers
export const setupWebSocketHandlers = () => {
  const tasksStore = useTasksStore.getState();

  // Task events
  wsClient.on('task.created', (data: unknown) => {
    const taskData = data as { task: Task };
    tasksStore.addTask(taskData.task);
  });

  wsClient.on('task.updated', (data: unknown) => {
    const updateData = data as { taskId: string; patch: Partial<Task> };
    tasksStore.updateTask(updateData.taskId, updateData.patch);
  });

  wsClient.on('task.deleted', (data: unknown) => {
    const deleteData = data as { taskId: string };
    tasksStore.removeTask(deleteData.taskId);
  });

  wsClient.on('task.duplicated', (data: unknown) => {
    const duplicateData = data as { newTask: Task };
    tasksStore.addTask(duplicateData.newTask);
  });

  // Star events
  wsClient.on('star.added', (data: unknown) => {
    const starData = data as { taskId: string };
    tasksStore.toggleStar(starData.taskId);
  });

  wsClient.on('star.removed', (data: unknown) => {
    const starData = data as { taskId: string };
    tasksStore.toggleStar(starData.taskId);
  });
};
