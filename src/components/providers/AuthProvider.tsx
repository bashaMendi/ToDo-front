'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, setupWebSocketHandlers } from '@/store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ensureWebSocketInitialized } from '@/lib/websocket';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { checkAuth, isLoading, isInitialized, error, isAuthenticated, user } = useAuthStore((state: any) => state) as any;
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize store hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Check authentication after hydration
  useEffect(() => {
    if (!isHydrated) return;
    
    checkAuth();
  }, [isHydrated, checkAuth]);

  // Redirect to login if not authenticated and not already on login page
  useEffect(() => {
    if (!isInitialized) return; // Wait for auth check to complete
    
    const isLoginPage = pathname === '/login';
    const isPublicPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname);
    
    if (!isAuthenticated && !isPublicPage) {
      router.push('/login');
    } else if (isAuthenticated && isLoginPage) {
      router.push('/');
    }
  }, [isInitialized, isAuthenticated, pathname, router]);

  // Monitor session status
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const interval = setInterval(() => {
      const { getSessionStatus } = (useAuthStore as any).getState();
      const sessionStatus = getSessionStatus();
      
      if (sessionStatus.isExpired) {
        (useAuthStore as any).getState().logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isInitialized, isAuthenticated]);



  // Setup WebSocket handlers
  useEffect(() => {
    if (!isInitialized) return;
    
    ensureWebSocketInitialized().then(() => {
      setupWebSocketHandlers();
    }).catch(() => {
      // Silent fail for WebSocket initialization
    });
  }, [isInitialized, user?.id]);

  // Setup activity listeners for session management
  useEffect(() => {
    if (!isInitialized) return;

    const { refreshSession } = (useAuthStore as any).getState();
    
    let lastRefreshTime = 0;
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    let activityTimeout: NodeJS.Timeout | null = null;
    
    const handleActivity = () => {
      // Throttle activity events to avoid spam
      if (activityTimeout) {
        return;
      }
      
      activityTimeout = setTimeout(() => {
        activityTimeout = null;
      }, 1000); // Throttle to once per second
      
      const now = Date.now();
      
      // Only refresh session every 5 minutes to avoid too many requests
      if (now - lastRefreshTime > REFRESH_INTERVAL) {
        // Check if user is still authenticated before refreshing
        const authState = (useAuthStore as any).getState();
        if (authState.isAuthenticated && !authState.isLoggingOut && !authState.error) {
          refreshSession();
          lastRefreshTime = now;
        }
      }
      // Removed else block to reduce spam
    };

    const events = ['mousedown', 'keypress', 'scroll', 'touchstart']; // Removed mousemove to reduce spam
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      // Cleanup activity timeout
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, [isInitialized]);

  // Show loading state while initializing
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

  // Show loading state if authenticated but user data is still loading
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

  // Show error state if there's a critical error (but not 401 which is normal)
  if (error && !isInitialized && error !== 'משתמש לא מחובר' && error !== 'שגיאת רשת - נסה שוב') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              שגיאה בטעינת המערכת
            </h2>
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

  return <>{children}</>;
}

