/**
 * Smart Session Manager for handling authentication state
 * Prevents unnecessary API calls and UI flickers
 */

import { useAuthStore } from '@/store';

interface SessionConfig {
  checkInterval: number;
  warningThreshold: number;
  maxRetries: number;
  retryDelay: number;
}

const defaultConfig: SessionConfig = {
  checkInterval: 5 * 60 * 1000, // 5 minutes instead of 30 seconds
  warningThreshold: 5 * 60 * 1000, // 5 minutes
  maxRetries: 1,
  retryDelay: 1500,
};

class SmartSessionManager {
  private config: SessionConfig;
  private lastCheckTime = 0;
  private isChecking = false;
  private checkTimeout: NodeJS.Timeout | null = null;
  private warningTimeout: NodeJS.Timeout | null = null;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Smart auth check with debouncing
   */
  async checkAuth(): Promise<void> {
    const now = Date.now();
    
    // Prevent multiple simultaneous checks
    if (this.isChecking) {
      return;
    }

    // Debounce rapid auth checks
    if (now - this.lastCheckTime < 1000) {
      return;
    }

    this.isChecking = true;
    this.lastCheckTime = now;

    try {
      const store = useAuthStore.getState();
      
      // Don't check auth if we're logging out or already authenticated
      if (store.isLoggingOut || store.isAuthenticated) {
        return;
      }
      
      await store.checkAuth();
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Schedule next auth check
   */
  scheduleNextCheck(): void {
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }

    this.checkTimeout = setTimeout(() => {
      this.checkAuth();
    }, this.config.checkInterval);
  }

  /**
   * Setup session monitoring
   */
  setupMonitoring(): void {
    const store = useAuthStore.getState();
    
    if (!store.isAuthenticated) {
      return;
    }

    // Schedule next check
    this.scheduleNextCheck();

    // Setup warning if session is close to expiry
    if (store.sessionExpiryTime) {
      this.setupWarning(store.sessionExpiryTime);
    }
  }

  /**
   * Setup session expiry warning
   */
  private setupWarning(expiryTime: number): void {
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }

    const timeUntilWarning = expiryTime - Date.now() - this.config.warningThreshold;
    
    if (timeUntilWarning > 0) {
      this.warningTimeout = setTimeout(() => {
        this.showWarning();
      }, timeUntilWarning);
    }
  }

  /**
   * Show session warning
   */
  private showWarning(): void {
    // This will be handled by the SessionManager component
    // We just trigger the warning state
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      // Trigger warning state in store
      // You can add a warning state to the store if needed
    }
  }

  /**
   * Cleanup timeouts and reset state
   */
  cleanup(): void {
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
      this.checkTimeout = null;
    }
    
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }

    // Reset state
    this.isChecking = false;
    this.lastCheckTime = 0;
  }
}

// Export singleton instance
export const smartSessionManager = new SmartSessionManager();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    smartSessionManager.cleanup();
  });
}
