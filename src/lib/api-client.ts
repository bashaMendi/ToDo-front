import { handleError } from './error-handler';

// API configuration
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Request interceptor
interface RequestConfig extends RequestInit {
  retryCount?: number;
  timeout?: number;
}

// Response wrapper
interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: number;
    message: string;
    requestId: string;
    field?: string;
  };
}

// Enhanced fetch with timeout and retry logic
async function enhancedFetch<T>(
  url: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const {
    retryCount = 0,
    timeout = API_CONFIG.timeout,
    ...fetchConfig
  } = config;

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Add default headers
    const headers = new Headers(fetchConfig.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Make request
    const response = await fetch(url, {
      ...fetchConfig,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle different response types
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      const error = {
        status: response.status,
        message: errorData.message || `HTTP ${response.status}`,
        data: errorData,
      };

      // Handle specific error types
      if (response.status === 401) {
        // Redirect to login
        window.location.href = '/login';
        return { error: { code: 401, message: 'יש להתחבר מחדש', requestId: '' } };
      }

      if (response.status === 403) {
        return { error: { code: 403, message: 'אין לך הרשאה לבצע פעולה זו', requestId: '' } };
      }

      // Retry logic for certain errors
      if (
        (response.status >= 500 || response.status === 429) &&
        retryCount < API_CONFIG.retryAttempts
      ) {
        await new Promise(resolve => 
          setTimeout(resolve, API_CONFIG.retryDelay * Math.pow(2, retryCount))
        );
        
        return enhancedFetch<T>(url, {
          ...config,
          retryCount: retryCount + 1,
        });
      }

      throw error;
    }

    // Parse response
    const data = await response.json();
    return { data };

  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      handleError(error, {
        component: 'ApiClient',
        action: 'fetch',
        url,
      });
      
      return {
        error: {
          code: 0,
          message: 'בעיית חיבור לרשת',
          requestId: '',
        },
      };
    }

    // Handle timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      handleError(error, {
        component: 'ApiClient',
        action: 'timeout',
        url,
      });
      
      return {
        error: {
          code: 0,
          message: 'הבקשה ארכה יותר מדי זמן',
          requestId: '',
        },
      };
    }

    // Handle other errors
    handleError(error, {
      component: 'ApiClient',
      action: 'request',
      url,
    });

    return {
      error: {
        code: 0,
        message: 'אירעה שגיאה לא צפויה',
        requestId: '',
      },
    };
  }
}

// API client class
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_CONFIG.baseURL) {
    this.baseURL = baseURL;
  }

  // Helper method to build URL
  private buildURL(endpoint: string): string {
    return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  // GET request
  async get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return enhancedFetch<T>(this.buildURL(endpoint), {
      method: 'GET',
      ...config,
    });
  }

  // POST request
  async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return enhancedFetch<T>(this.buildURL(endpoint), {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return enhancedFetch<T>(this.buildURL(endpoint), {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
    return enhancedFetch<T>(this.buildURL(endpoint), {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return enhancedFetch<T>(this.buildURL(endpoint), {
      method: 'DELETE',
      ...config,
    });
  }

  // Upload file
  async upload<T>(endpoint: string, file: File, config?: RequestConfig): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return enhancedFetch<T>(this.buildURL(endpoint), {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
      ...config,
    });
  }

  // Download file
  async download(endpoint: string, filename?: string): Promise<void> {
    try {
      const response = await fetch(this.buildURL(endpoint), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      handleError(error, {
        component: 'ApiClient',
        action: 'download',
        url: endpoint,
      });
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiResponse, RequestConfig };

// Export convenience functions
export const api = {
  get: <T>(endpoint: string, config?: RequestConfig) => apiClient.get<T>(endpoint, config),
  post: <T>(endpoint: string, data?: unknown, config?: RequestConfig) => apiClient.post<T>(endpoint, data, config),
  put: <T>(endpoint: string, data?: unknown, config?: RequestConfig) => apiClient.put<T>(endpoint, data, config),
  patch: <T>(endpoint: string, data?: unknown, config?: RequestConfig) => apiClient.patch<T>(endpoint, data, config),
  delete: <T>(endpoint: string, config?: RequestConfig) => apiClient.delete<T>(endpoint, config),
  upload: <T>(endpoint: string, file: File, config?: RequestConfig) => apiClient.upload<T>(endpoint, file, config),
  download: (endpoint: string, filename?: string) => apiClient.download(endpoint, filename),
};
