'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, setupWebSocketHandlers } from '@/store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ensureWebSocketInitialized } from '@/lib/websocket';
import { useQueryClient } from '@tanstack/react-query';
import { smartSessionManager } from '@/lib/session-manager';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const queryClient = useQueryClient();

  // ---- Read state and actions via Zustand selectors (avoid using .getState() directly) ----
  const isLoading        = useAuthStore(s => s.isLoading);
  const isInitialized    = useAuthStore(s => s.isInitialized);
  const error            = useAuthStore(s => s.error);
  const isAuthenticated  = useAuthStore(s => s.isAuthenticated);
  const user             = useAuthStore(s => s.user);

  const checkAuth        = useAuthStore(s => s.checkAuth);
  const getSessionStatus = useAuthStore(s => s.getSessionStatus);
  const logout           = useAuthStore(s => s.logout);
  const refreshSession   = useAuthStore(s => s.refreshSession);
  const isLoggingOut     = useAuthStore(s => s.isLoggingOut);

  // Wait for client hydration before running client-only logic
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Trigger initial auth check after hydration with a small delay to prevent race conditions
  useEffect(() => {
    if (!isHydrated) return;
    
    // Add a small delay to prevent race conditions with other providers
    const authCheckTimer = setTimeout(() => {
      smartSessionManager.checkAuth();
    }, 100);
    
    return () => clearTimeout(authCheckTimer);
  }, [isHydrated]);

  // Setup smart session monitoring once auth is initialized
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;
    
    smartSessionManager.setupMonitoring();
    
    return () => {
      smartSessionManager.cleanup();
    };
  }, [isInitialized, isAuthenticated]);

  // Optimized window focus and visibility change handlers
  useEffect(() => {
    if (!isHydrated || !isInitialized) return;

    let lastCheckTime = 0;
    const CHECK_THROTTLE = 30000; // Increased to 30 seconds to reduce unnecessary checks

    const handleAuthCheck = () => {
      const now = Date.now();
      
      if (now - lastCheckTime < CHECK_THROTTLE) {
        return;
      }
      lastCheckTime = now;

      // Only check auth if we're not authenticated and not currently loading
      if (!isAuthenticated && !isLoading) {
        smartSessionManager.checkAuth();
      }
    };

    const handleWindowFocus = () => handleAuthCheck();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleAuthCheck();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isHydrated, isInitialized, isAuthenticated, isLoading]);

  // Redirect based on authentication state and current route
  useEffect(() => {
    if (!isInitialized) return;

    const isLoginPage  = pathname === '/login';
    const isPublicPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname);

    // Don't redirect if still loading auth
    if (isLoading) return;

    // Only redirect if clearly not authenticated and not on a public page
    if (!isAuthenticated && !isPublicPage) {
      // Increased delay to prevent premature redirects during auth check
      const redirectTimeout = setTimeout(() => {
        if (!isAuthenticated && !isLoading) {
          router.push('/login');
        }
      }, 2500); // Increased to 2.5 seconds for better stability

      return () => clearTimeout(redirectTimeout);
    } else if (isAuthenticated && isLoginPage) {
      // Only redirect to home if we're on login page and authenticated
      const redirectTimeout = setTimeout(() => {
        if (isAuthenticated && isLoginPage) {
          router.push('/');
        }
      }, 1000); // Increased to 1 second

      return () => clearTimeout(redirectTimeout);
    }
  }, [isInitialized, isAuthenticated, isLoading, pathname, router]);

  // Periodically check if the session expired and logout if needed
  // Temporarily disabled to prevent logout loops
  // useEffect(() => {
  //   if (!isInitialized || !isAuthenticated) return;

  //   const interval = setInterval(() => {
  //     const sessionStatus = getSessionStatus?.();
  //     if (sessionStatus?.isExpired) {
  //       logout();
  //     }
  //   }, 60_000); // every 60s

  //   return () => clearInterval(interval);
  // }, [isInitialized, isAuthenticated, getSessionStatus, logout]);

  // Initialize WebSocket and register handlers once auth is ready (lazy loading)
  useEffect(() => {
    if (!isInitialized) return;

    let wsInitialized = false;
    let activityTimeout: NodeJS.Timeout;

    const initializeWebSocket = () => {
      if (wsInitialized) return;
      
      wsInitialized = true;
      ensureWebSocketInitialized()
        .then(() => {
          // Provide the real fetchTasks callback for WebSocket events
          setupWebSocketHandlers?.(async () => {
            // Invalidate all tasks queries to refresh data
            await queryClient.invalidateQueries({ queryKey: ['tasks'] });
          });
        })
        .catch(() => {
          // Ignore WS init errors silently (do not break the UI)
        });
    };

    // Initialize WebSocket after 5 seconds of activity
    const handleActivity = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(initializeWebSocket, 5000);
    };

    // Start activity monitoring
    handleActivity();

    // Listen for user activity
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimeout(activityTimeout);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isInitialized, user?.id, queryClient]);

  // Add throttled activity listeners to refresh the session periodically
  // Temporarily disabled to prevent logout loops
  // useEffect(() => {
  //   if (!isInitialized) return;

  //   let lastRefreshTime = 0;
  //   const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
  //   let activityTimeout: ReturnType<typeof setTimeout> | null = null;

  //   const handleActivity = () => {
  //     // Throttle activity events to once per second
  //     if (activityTimeout) return;
  //     activityTimeout = setTimeout(() => {
  //       activityTimeout = null;
  //     }, 1000);

  //     const now = Date.now();
  //     // Refresh only if enough time passed and auth is still valid
  //     if (now - lastRefreshTime > REFRESH_INTERVAL) {
  //       if (isAuthenticated && !isLoggingOut && !error) {
  //         refreshSession?.();
  //         lastRefreshTime = now;
  //       }
  //     }
  //   };

  //   const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
  //   events.forEach(e => document.addEventListener(e, handleActivity, true));

  //   return () => {
  //     events.forEach(e => document.removeEventListener(e, handleActivity, true));
  //     if (activityTimeout) clearTimeout(activityTimeout);
  //   };
  // }, [isInitialized, isAuthenticated, isLoggingOut, error, refreshSession]);

  // Auto-load tasks when authentication is successful
  useEffect(() => {
    if (isAuthenticated && isInitialized && !isLoading) {
      // Let components handle their own task loading
      // This prevents initialization issues and race conditions
    }
  }, [isAuthenticated, isInitialized, isLoading]);

  // Loading states while auth is initializing
  // Only show loading if not hydrated OR if not initialized and loading
  if (!isHydrated || (!isInitialized && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">מאמת התחברות...</p>
        </div>
      </div>
    );
  }

  // Loading state when authenticated but user details are still being fetched
  // Only show this if we're authenticated but don't have user details yet
  // AND we're not on a protected route (which has its own loading state)
  if (isAuthenticated && !user && isLoading && !pathname.startsWith('/mine') && !pathname.startsWith('/starred')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">טוען פרטי משתמש...</p>
        </div>
      </div>
    );
  }

  // Error state (ignore expected unauthenticated/network transient messages)
  if (error && !isInitialized && error !== 'משתמש לא מחובר' && error !== 'שגיאת רשת - נסה שוב') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-red-800 mb-2">שגיאה בטעינת המערכת</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              טען מחדש
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render children when everything is ready
  return <>{children}</>;
}
