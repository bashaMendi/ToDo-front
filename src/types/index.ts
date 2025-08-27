// User types
export interface User {
  id: string;
  email: string;
  name: string;
  provider: 'credentials' | 'google';
  createdAt: string;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description?: string;
  createdBy: User;
  createdAt: string;
  updatedBy?: User;
  updatedAt: string;
  assignees: User[];
  version: number;
  isStarred: boolean; // for current user
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: number;
    message: string;
    requestId: string;
    field?: string;
  };
  sessionExpiry?: number; // Unix timestamp when session expires
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  total: number;
  hasMore: boolean;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
}

// Task creation/update types
export interface CreateTaskData {
  title: string;
  description?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  assignees?: string[];
}

// Search and filter types
export interface TaskFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'createdBy';
  sortOrder?: 'asc' | 'desc';
  assignedToMe?: boolean;
  starred?: boolean;
  context?: 'all' | 'mine' | 'starred';
}

// WebSocket event types
export interface WebSocketEvent {
  eventId: string;
  emittedAt: string;
}

export interface TaskCreatedEvent extends WebSocketEvent {
  type: 'task.created';
  task: Task;
}

export interface TaskUpdatedEvent extends WebSocketEvent {
  type: 'task.updated';
  taskId: string;
  patch: Partial<Task>;
}

export interface TaskDeletedEvent extends WebSocketEvent {
  type: 'task.deleted';
  taskId: string;
}

export interface StarAddedEvent extends WebSocketEvent {
  type: 'star.added';
  taskId: string;
}

export interface StarRemovedEvent extends WebSocketEvent {
  type: 'star.removed';
  taskId: string;
}

export type WebSocketEvents =
  | TaskCreatedEvent
  | TaskUpdatedEvent
  | TaskDeletedEvent
  | StarAddedEvent
  | StarRemovedEvent;

// Form validation schemas
export interface TaskFormData {
  title: string;
  description: string;
}

// UI State types
export interface UIComponentState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

export interface ModalState {
  isOpen: boolean;
  taskId?: string;
  type: 'create' | 'edit' | 'delete' | 'history' | null;
}

// Navigation types
export interface NavigationItem {
  id: 'home' | 'mine' | 'starred';
  label: string;
  href: string;
  icon: string;
}

// Export types
export type ExportFormat = 'csv' | 'json' | 'excel';

// Error types
export interface ApiError {
  code: number;
  message: string;
  requestId: string;
  field?: string;
}

// Session types
export interface Session {
  user: User;
  expiresAt: string;
}
