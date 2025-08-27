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
// Removed handleError import - errors are handled by components


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
    // Check if we're in the middle of logout
    const authStore = (await import('@/store')).useAuthStore;
    const isLoggingOut = (authStore as any).getState().isLoggingOut;
    
    if (isLoggingOut) {
      return { data: undefined };
    }
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for session
      mode: 'cors',
      method: options.method,
      body: options.body,
    };

    // Only set Content-Type for requests with body
    if (!options.body) {
      delete (config.headers as Record<string, string>)['Content-Type'];
    }

    try {
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
        
      // Check if response has content
      const contentType = response.headers.get('content-type');
        let data;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          // If JSON parsing fails, return empty object
          data = {};
        }
      } else {
        // If not JSON, return empty object
        data = {};
      }
      

      


              if (!response.ok) {
        
        // Handle authentication errors
        if (response.status === 401) {
          // For /auth/me endpoint, 401 is expected when user is not logged in
          if (endpoint.includes('/auth/me')) {
            // Return empty response instead of error for /auth/me 401
            return {
              data: undefined,
              error: undefined,
            };
          }
          
          // For login/signup endpoints, 401 means invalid credentials
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
          
          // For other 401 errors, trigger logout without showing error
          const authStore = (await import('@/store')).useAuthStore;
          (authStore as any).getState().logout();
          
          // Return empty response to prevent error handling
          return {
            data: undefined,
            error: undefined,
          };
        }

        // Handle 404 errors - resource not found
        if (response.status === 404) {
          // Don't log 404 errors as they're expected after deletion
          return {
            error: {
              code: 404,
              message: 'המשאב המבוקש לא נמצא',
              requestId: data.requestId || 'unknown',
            },
          };
        }
        
        // Don't use error handler for API errors - let components handle them

        return {
          error: {
            code: response.status,
            message: data.message || 'שגיאה לא ידועה',
            requestId: data.requestId || 'unknown',
            field: data.field,
          },
        };
      }

      // Handle nested data structure from server
      if (data.data && typeof data.data === 'object') {
        // Server returns { data: { user: {...} } } format
        return { data: data.data };
      }
      
      // Check for session expiry in headers
      const sessionExpiresAt = response.headers.get('X-Session-Expires-At');
      if (sessionExpiresAt) {
        // Convert ISO string to timestamp
        const sessionExpiry = new Date(sessionExpiresAt).getTime();
        return { data, sessionExpiry };
      }
      
      // Handle nested data structure from server
      if (data.data && typeof data.data === 'object') {
        // Server returns { data: { user: {...} } } format
        return { data: data.data };
      }
      
      return { data };
    } catch (error) {
      // Handle network errors (server not available)
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return {
          error: {
            code: 0,
            message: 'השרת לא זמין כרגע - נסה שוב מאוחר יותר',
            requestId: 'network-error',
          },
        };
      }
      
      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          error: {
            code: 408,
            message: 'בקשה נכשלה - נסה שוב',
            requestId: 'timeout-error',
          },
        };
      }
      
      // Don't use error handler for network errors - let components handle them
      
      return {
        error: {
          code: 0,
          message: 'השרת לא זמין כרגע - נסה שוב מאוחר יותר',
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
    try {
      return await this.request('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Return success even if network fails - we still want to clear local state
      return { data: undefined };
    }
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    // HttpOnly cookies are not accessible via JavaScript
    // So we can't check document.cookie for HttpOnly cookies
    // Instead, we'll make the API call and let the server decide
    
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

    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.assignedToMe) params.append('assignedToMe', filters.assignedToMe.toString());
    if (filters.starred) params.append('starred', filters.starred.toString());
    if (filters.context) {
      params.append('context', filters.context);
    }

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
    // Set headers for the request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add version header if provided
    if (version) {
      headers['If-Match'] = version.toString();
    }

    const requestBody = JSON.stringify(data);

    const response = await this.request(`/tasks/${id}`, {
      method: 'PATCH',
      headers,
      body: requestBody,
    });
    return response as ApiResponse<Task>;
  }

  async deleteTask(id: string): Promise<ApiResponse<{ undoToken: string }>> {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async duplicateTask(id: string): Promise<ApiResponse<Task>> {
    const response = await this.request(`/tasks/${id}/duplicate`, {
      method: 'POST',
    });
    return response as ApiResponse<Task>;
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
      
      // Don't use error handler - let components handle errors

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
