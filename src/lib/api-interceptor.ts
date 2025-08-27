/**
 * API Interceptor for handling session management and automatic logout
 */

import { useAuthStore } from '@/store';

interface InterceptorConfig {
  enableSessionRefresh: boolean;
  sessionWarningThreshold: number; // minutes before expiry to show warning
  maxRetryAttempts: number;
}

const defaultConfig: InterceptorConfig = {
  enableSessionRefresh: true,
  sessionWarningThreshold: 5, // 5 minutes before expiry
  maxRetryAttempts: 1,
};

class ApiInterceptor {
  private config: InterceptorConfig;
  private warningShown = false;

  constructor(config: Partial<InterceptorConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Intercept API responses to handle authentication errors
   */
  async interceptResponse(
    response: Response, 
    originalRequest: () => Promise<Response>
  ): Promise<Response> {
    // Handle 401 - Unauthorized
    if (response.status === 401) {
      return this.handleUnauthorized(originalRequest);
    }

    // Handle other errors
    if (!response.ok) {
      this.handleHttpError(response);
    }

    return response;
  }

  /**
   * Handle unauthorized responses
   */
  private async handleUnauthorized(
    originalRequest: () => Promise<Response>
  ): Promise<Response> {
    const authStore = (useAuthStore as any).getState();

    // Don't try to refresh session for auth endpoints (login/signup)
    // This prevents infinite loops
    const currentUrl = window.location.href;
    if (currentUrl.includes('/login') || currentUrl.includes('/signup')) {
      return new Response(
        JSON.stringify({ 
          error: { 
            code: 401, 
            message: 'Invalid credentials', 
            requestId: 'auth-failed' 
          } 
        }),
        { status: 401 }
      );
    }

    // Try to refresh session if enabled
    if (this.config.enableSessionRefresh) {
      const refreshed = await authStore.refreshSession();
      
      if (refreshed) {
        // Retry original request with new session
        return originalRequest();
      }
    }

    // If refresh failed or disabled, logout user
    await authStore.logout();
    
    // Return original 401 response
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 401, 
          message: 'Session expired', 
          requestId: 'auth-expired' 
        } 
      }),
      { status: 401 }
    );
  }

  /**
   * Handle other HTTP errors
   */
  private handleHttpError(response: Response): void {
    // Silent error handling for production
    // Handle specific error codes silently
    switch (response.status) {
      case 403:
        // Access forbidden - insufficient permissions
        break;
      case 429:
        // Rate limit exceeded
        break;
      case 500:
      case 502:
      case 503:
        // Server error - retrying may help
        break;
      default:
        // Unhandled HTTP error
        break;
    }
  }

  /**
   * Show session expiry warning
   */
  showSessionWarning(): void {
    if (this.warningShown) return;
    
    this.warningShown = true;
    
    // Create warning notification
    const warning = document.createElement('div');
    warning.className = 'fixed top-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg z-50';
    warning.innerHTML = `
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-yellow-800">
            התחברות תפוג בקרוב
          </h3>
          <p class="text-sm text-yellow-700 mt-1">
            ההתחברות שלך תפוג בעוד ${this.config.sessionWarningThreshold} דקות
          </p>
        </div>
        <div class="ml-auto">
          <button 
            onclick="this.parentElement.parentElement.remove()"
            class="text-yellow-400 hover:text-yellow-600"
          >
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(warning);

    // Auto remove warning after 10 seconds
    setTimeout(() => {
      if (warning.parentElement) {
        warning.remove();
      }
      this.warningShown = false;
    }, 10000);
  }

  /**
   * Setup session monitoring
   */
  setupSessionMonitoring(): void {
    const authStore = (useAuthStore as any).getState();
    
    // Check session periodically
    const checkInterval = setInterval(() => {
      if (!authStore.isAuthenticated) {
        clearInterval(checkInterval);
        return;
      }

      // Here you would check session expiry time from server/cookie
      // For now, we'll use the session timeout from store
      const { sessionTimeout } = authStore;
      if (sessionTimeout) {
        // Show warning if close to expiry
        this.showSessionWarning();
      }
    }, 60000); // Check every minute
  }

  /**
   * Reset warning state
   */
  resetWarning(): void {
    this.warningShown = false;
  }
}

// Export singleton instance
export const apiInterceptor = new ApiInterceptor();

// Setup session monitoring when auth store is available
if (typeof window !== 'undefined') {
  // Wait for store to be available
  setTimeout(() => {
    apiInterceptor.setupSessionMonitoring();
  }, 1000);
}
