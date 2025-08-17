import {
  User,
  Task,
  ApiResponse,
  PaginatedResponse,
  LoginCredentials,
  SignupCredentials,
  CreateTaskData,
  UpdateTaskData,
  TaskFilters,
  ExportFormat,
} from '@/types';
import { handleError } from './error-handler';


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Use enhanced error handling
        const error = {
          status: response.status,
          message: data.message || 'שגיאה לא ידועה',
          data,
        };
        
        handleError(error, {
          component: 'ApiClient',
          action: options.method || 'GET',
          url: endpoint,
        });

        return {
          error: {
            code: response.status,
            message: data.message || 'שגיאה לא ידועה',
            requestId: data.requestId || 'unknown',
            field: data.field,
          },
        };
      }

      return { data };
    } catch (error) {
      // Use enhanced error handling
      handleError(error, {
        component: 'ApiClient',
        action: options.method || 'GET',
        url: endpoint,
      });

      return {
        error: {
          code: 0,
          message: error instanceof Error ? error.message : 'שגיאת רשת',
          requestId: 'network-error',
        },
      };
    }
  }

  // Auth endpoints
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async signup(
    credentials: SignupCredentials
  ): Promise<ApiResponse<{ user: User }>> {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/auth/me');
  }

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return this.request('/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<ApiResponse<void>> {
    return this.request('/auth/reset', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // Task endpoints
  async getTasks(
    filters: TaskFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<Task>>> {
    const params = new URLSearchParams();

    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.assignedToMe) params.append('assignedToMe', filters.assignedToMe.toString());
    if (filters.starred) params.append('starred', filters.starred.toString());
    if (filters.context) params.append('context', filters.context);

    const queryString = params.toString();
    const endpoint = `/tasks${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  async getTask(id: string): Promise<ApiResponse<Task>> {
    return this.request(`/tasks/${id}`);
  }

  async createTask(data: CreateTaskData): Promise<ApiResponse<Task>> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(
    id: string,
    data: UpdateTaskData,
    version?: number
  ): Promise<ApiResponse<Task>> {
    const headers: Record<string, string> = {};
    if (version) {
      headers['If-Match'] = version.toString();
    }

    return this.request(`/tasks/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string): Promise<ApiResponse<{ undoToken: string }>> {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async duplicateTask(id: string): Promise<ApiResponse<Task>> {
    return this.request(`/tasks/${id}/duplicate`, {
      method: 'POST',
    });
  }

  async assignSelfToTask(id: string): Promise<ApiResponse<void>> {
    return this.request(`/tasks/${id}/assign/me`, {
      method: 'PUT',
    });
  }

  // Star endpoints
  async addStar(taskId: string): Promise<ApiResponse<void>> {
    return this.request(`/tasks/${taskId}/star`, {
      method: 'PUT',
    });
  }

  async removeStar(taskId: string): Promise<ApiResponse<void>> {
    return this.request(`/tasks/${taskId}/star`, {
      method: 'DELETE',
    });
  }

  async getStarredTasks(): Promise<ApiResponse<Task[]>> {
    return this.request('/me/starred');
  }

  // Personal endpoints
  async getMyTasks(): Promise<ApiResponse<PaginatedResponse<Task>>> {
    return this.request('/me/tasks');
  }

  async exportMyTasks(
    format: ExportFormat = 'csv'
  ): Promise<ApiResponse<Blob>> {
    const response = await fetch(
      `${this.baseURL}/me/tasks/export?format=${format}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      
      // Use enhanced error handling
      const error = {
        status: response.status,
        message: errorData.message || 'שגיאה בייצוא',
        data: errorData,
      };
      
      handleError(error, {
        component: 'ApiClient',
        action: 'export',
        url: '/me/tasks/export',
      });

      return {
        error: {
          code: response.status,
          message: errorData.message || 'שגיאה בייצוא',
          requestId: errorData.requestId || 'unknown',
        },
      };
    }

    const blob = await response.blob();
    return { data: blob };
  }

  // Utility endpoints
  async healthCheck(): Promise<
    ApiResponse<{ status: string; timestamp: string }>
  > {
    return this.request('/health');
  }

  async sync(since?: string): Promise<ApiResponse<Task[]>> {
    const params = since ? `?since=${since}` : '';
    return this.request(`/sync${params}`);
  }
}

// Create and export the API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export the class for testing
export { ApiClient };
