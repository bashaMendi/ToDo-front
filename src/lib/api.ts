import type {
  User, Task, ApiResponse, PaginatedResponse, LoginCredentials, SignupCredentials,
  CreateTaskData, UpdateTaskData, TaskFilters, ExportFormat, SyncResponse,
} from '@/types';
import { API_ENDPOINTS } from './constants';

// Resolve base URL at build time (NEXT_PUBLIC_* must be set in Netlify)
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Normalize base: remove trailing slash
const normalizeBase = (u: string) => u.replace(/\/+$/, '');
const API_BASE_URL = normalizeBase(RAW_BASE);

// Simple join ensuring exactly one slash
const joinURL = (base: string, path: string) =>
  `${base}/${String(path || '').replace(/^\/+/, '')}`;



class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Prevent actions during logout
    const { useAuthStore } = await import('@/store');
    const isLoggingOut = (useAuthStore as any).getState?.().isLoggingOut;

    if (isLoggingOut) return { data: undefined };

    const url = joinURL(this.baseURL, endpoint);

    const config: RequestInit = {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      credentials: 'include',
      mode: 'cors',
      method: options.method,
      body: options.body,
    };

    if (!options.body) {
      delete (config.headers as Record<string, string>)['Content-Type'];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Increased from 3000ms to 5000ms for better refresh handling
      const response = await fetch(url, { ...config, signal: controller.signal });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      let data: any = {};
      
      if (contentType?.includes('application/json')) {
        try { data = await response.json(); } catch { data = {}; }
      } else if (contentType?.includes('text/csv') || 
                 contentType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
                 contentType?.includes('application/octet-stream')) {
        // Handle binary data (CSV, Excel, etc.)
        data = await response.blob();
      } else {
        // Try to parse as JSON by default
        try { data = await response.json(); } catch { data = {}; }
      }

      if (!response.ok) {
        if (response.status === 401) {
          // Treat "who am I" endpoints as non-fatal (don't force logout)
          const mePaths = ['/me', '/auth/me'];
          const isMeEndpoint = mePaths.some(p =>
            endpoint === p || endpoint.endsWith(p)
          );

          if (isMeEndpoint) {
            // Return clear "not logged" state
            return { 
              data: undefined, 
              error: { 
                code: 401, 
                message: 'Not authenticated', 
                requestId: data.requestId || 'unknown' 
              } 
            };
          }

          // For login/signup 401: surface validation errors
          if (endpoint.includes('/auth/login') || endpoint.includes('/auth/signup')) {
            return {
              error: {
                code: 401,
                message: data.message || 'פרטי התחברות שגויים',
                requestId: data.requestId || 'unknown',
                field: data.field,
              },
            };
          }

          // For other 401 errors: return error without auto-logout
          // Let the calling layer (store/Provider) decide what to do
          return {
            error: {
              code: 401,
              message: data.message || 'לא מורשה',
              requestId: data.requestId || 'unknown',
            },
          };
        }
        if (response.status === 404) {
          return { error: { code: 404, message: 'המשאב המבוקש לא נמצא', requestId: data.requestId || 'unknown' } };
        }
        return { error: { code: response.status, message: data.message || 'שגיאה לא ידועה', requestId: data.requestId || 'unknown', field: data.field } };
      }

      const sessionExpiresAt = response.headers.get('X-Session-Expires-At');
      if (sessionExpiresAt) {
        const sessionExpiry = new Date(sessionExpiresAt).getTime();
        return { data: data?.data ?? data, sessionExpiry };
      }
      return { data: data?.data ?? data };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return { error: { code: 408, message: 'בקשה נכשלה - נסה שוב', requestId: 'timeout-error' } };
      }
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return { error: { code: 0, message: 'השרת לא זמין כרגע - נסה שוב מאוחר יותר', requestId: 'network-error' } };
      }
      return { error: { code: 0, message: 'השרת לא זמין כרגע - נסה שוב מאוחר יותר', requestId: 'network-error' } };
    }
  }

  // --- Auth ---
  login(credentials: LoginCredentials) {
    return this.request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  }
  signup(credentials: SignupCredentials) {
    return this.request<{ user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(credentials) });
  }
  logout() { return this.request<void>('/auth/logout', { method: 'POST' }); }
  getCurrentUser() { return this.request<User>('/me'); }
  forgotPassword(email: string) { return this.request<void>('/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) }); }
  resetPassword(token: string, newPassword: string) { return this.request<void>('/auth/reset', { method: 'POST', body: JSON.stringify({ token, newPassword }) }); }

  // --- Tasks ---
  getTasks(filters: TaskFilters = {}) {
    const p = new URLSearchParams();
    if (filters.search) p.append('search', filters.search);
    if (filters.page) p.append('page', String(filters.page));
    if (filters.limit) p.append('limit', String(filters.limit));
    if (filters.sortBy) p.append('sortBy', filters.sortBy);
    if (filters.sortOrder) p.append('sortOrder', filters.sortOrder);
    if (filters.assignedToMe) p.append('assignedToMe', String(filters.assignedToMe));
    if (filters.starred) p.append('starred', String(filters.starred));
    if (filters.context) p.append('context', filters.context);
    return this.request<PaginatedResponse<Task>>(`/tasks${p.toString() ? `?${p.toString()}` : ''}`);
  }
  getTask(id: string) { return this.request<Task>(`/tasks/${id}`); }
  createTask(data: CreateTaskData) { return this.request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }); }
  updateTask(id: string, data: UpdateTaskData, version?: number) {
    const headers: Record<string,string> = { 'Content-Type': 'application/json' };
    if (version) headers['If-Match'] = String(version);
    return this.request<Task>(`/tasks/${id}`, { method: 'PATCH', headers, body: JSON.stringify(data) }) as Promise<ApiResponse<Task>>;
  }
  deleteTask(id: string) { return this.request<{ undoToken: string }>(`/tasks/${id}`, { method: 'DELETE' }); }
  duplicateTask(id: string) { return this.request<Task>(`/tasks/${id}/duplicate`, { method: 'POST' }) as Promise<ApiResponse<Task>>; }
  assignSelfToTask(id: string) { return this.request<void>(`/tasks/${id}/assign/me`, { method: 'PUT' }); }
  
  // Star endpoints
  addStar(taskId: string) { 
    return this.request<void>(`/tasks/${taskId}/star`, { method: 'PUT' }); 
  }
  
  removeStar(taskId: string) { 
    return this.request<void>(`/tasks/${taskId}/star`, { method: 'DELETE' }); 
  }
  
  getStarredTasks() { return this.request<Task[]>('/me/starred'); }
  getMyTasks() { return this.request<PaginatedResponse<Task>>('/me/tasks'); }
  async exportMyTasks(format: ExportFormat = 'csv') {
    // Add cache-busting parameter to prevent 304 responses
    const timestamp = Date.now();
    const response = await this.request<Blob>(`${API_ENDPOINTS.EXPORT_TASKS}?format=${format}&_t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Accept': format === 'json' ? 'application/json' : 
                  format === 'csv' ? 'text/csv' : 
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Cache-Control': 'no-cache'
      }
    });
    
    // If successful, return the blob data
    if (response.data) {
      return { data: response.data };
    }
    
    // If error, return the error
    return { error: response.error };
  }
  healthCheck() { return this.request<{ status: string; timestamp: string }>('/health'); }
  sync(since: string) { 
    return this.request<SyncResponse>(`/sync?since=${encodeURIComponent(since)}`); 
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export { ApiClient };
