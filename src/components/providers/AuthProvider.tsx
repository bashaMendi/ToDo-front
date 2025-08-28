'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, setupWebSocketHandlers } from '@/store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ensureWebSocketInitialized } from '@/lib/websocket';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);

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

  // Trigger initial auth check after hydration
  useEffect(() => {
    if (!isHydrated) return;
    checkAuth();
  }, [isHydrated, checkAuth]);

  // Redirect based on authentication state and current route
  useEffect(() => {
    if (!isInitialized) return;

    const isLoginPage  = pathname === '/login';
    const isPublicPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname);

    if (!isAuthenticated && !isPublicPage) {
      router.push('/login');
    } else if (isAuthenticated && isLoginPage) {
      router.push('/');
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  // Periodically check if the session expired and logout if needed
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const interval = setInterval(() => {
      const sessionStatus = getSessionStatus?.();
      if (sessionStatus?.isExpired) {
        logout();
      }
    }, 60_000); // every 60s

    return () => clearInterval(interval);
  }, [isInitialized, isAuthenticated, getSessionStatus, logout]);

  // Initialize WebSocket and register handlers once auth is ready
  useEffect(() => {
    if (!isInitialized) return;

    ensureWebSocketInitialized()
      .then(() => {
        // Provide a placeholder callback; replace with the real fetchTasks when available
        setupWebSocketHandlers?.(async () => {
          // WebSocket event received
        });
      })
      .catch(() => {
        // Ignore WS init errors silently (do not break the UI)
      });
  }, [isInitialized, user?.id]);

  // Add throttled activity listeners to refresh the session periodically
  useEffect(() => {
    if (!isInitialized) return;

    let lastRefreshTime = 0;
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    let activityTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleActivity = () => {
      // Throttle activity events to once per second
      if (activityTimeout) return;
      activityTimeout = setTimeout(() => {
        activityTimeout = null;
      }, 1000);

      const now = Date.now();
      // Refresh only if enough time passed and auth is still valid
      if (now - lastRefreshTime > REFRESH_INTERVAL) {
        if (isAuthenticated && !isLoggingOut && !error) {
          refreshSession?.();
          lastRefreshTime = now;
        }
      }
    };

    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, handleActivity, true));

    return () => {
      events.forEach(e => document.removeEventListener(e, handleActivity, true));
      if (activityTimeout) clearTimeout(activityTimeout);
    };
  }, [isInitialized, isAuthenticated, isLoggingOut, error, refreshSession]);

  // Loading states while auth is initializing
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
  if (isAuthenticated && !user && isLoading) {
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
