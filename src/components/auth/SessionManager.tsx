'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store';

interface SessionManagerProps {
  children: React.ReactNode;
}

/**
 * SessionManager handles session timeout warnings and automatic logout
 */
export function SessionManager({ children }: SessionManagerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { isAuthenticated, sessionTimeout, refreshSession } = useAuthStore((state: any) => state) as any;
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Setup session timeout monitoring
  useEffect(() => {
    if (!isAuthenticated || !sessionTimeout) return;

    // Calculate time until session expires (24 hours)
    // const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
    
    const checkTimeLeft = () => {
      const now = Date.now();
      const timeRemaining = sessionTimeout - now;
      
      setTimeLeft(timeRemaining);
      
      // Show warning when 5 minutes left
      if (timeRemaining <= WARNING_THRESHOLD && timeRemaining > 0) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
      
      // Auto logout when session expires
      if (timeRemaining <= 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuthStore as any).getState().logout();
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkTimeLeft, 30000);
    checkTimeLeft(); // Initial check

    return () => clearInterval(interval);
  }, [isAuthenticated, sessionTimeout]);

  // Setup activity listeners to refresh session
  useEffect(() => {
    if (!isAuthenticated) return;

    let activityTimeout: NodeJS.Timeout;

    const resetActivityTimer = () => {
      clearTimeout(activityTimeout);
      
      // Refresh session after 1 minute of inactivity
      activityTimeout = setTimeout(() => {
        refreshSession();
      }, 60000);
    };

    const handleActivity = () => {
      resetActivityTimer();
      // Hide warning on activity
      if (showWarning) {
        setShowWarning(false);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    resetActivityTimer();

    return () => {
      clearTimeout(activityTimeout);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [isAuthenticated, refreshSession, showWarning]);

  const formatTimeLeft = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleExtendSession = async () => {
    const success = await refreshSession();
    if (success) {
      setShowWarning(false);
      setTimeLeft(30 * 60 * 1000); // Reset to 30 minutes
    }
  };

  const handleLogout = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useAuthStore as any).getState().logout();
  };

  return (
    <>
      {children}
      
      {/* Session Warning Modal */}
      {showWarning && timeLeft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg 
                  className="h-8 w-8 text-yellow-400" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  ההתחברות תפוג בקרוב
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                ההתחברות שלך תפוג בעוד {formatTimeLeft(timeLeft)}
              </p>
              <p className="text-sm text-gray-500">
                האם ברצונך להאריך את ההתחברות?
              </p>
            </div>
            
            <div className="flex space-x-3 space-x-reverse">
              <button
                onClick={handleExtendSession}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                הארך התחברות
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                התנתק עכשיו
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
