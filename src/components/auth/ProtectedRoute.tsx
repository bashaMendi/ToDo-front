'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

/**
 * ProtectedRoute component that guards routes based on authentication status
 * @param children - The child components to render if authorized
 * @param redirectTo - The path to redirect to if not authorized (default: '/login')
 * @param requireAuth - Whether authentication is required (default: true)
 */
export function ProtectedRoute({ 
  children, 
  redirectTo = '/login',
  requireAuth = true 
}: ProtectedRouteProps) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { user, isAuthenticated, isLoading, isInitialized } = useAuthStore((state: any) => state) as any;

  useEffect(() => {
    // Only redirect once the auth check is complete
    if (!isInitialized) return;

    // Prevent multiple redirects
    if (isRedirecting) return;

    if (requireAuth && !isAuthenticated) {
      setIsRedirecting(true);
      // Add a small delay to prevent redirect loops
      const redirectTimer = setTimeout(() => {
        router.push(redirectTo);
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    } else if (!requireAuth && isAuthenticated) {
      // For auth pages like login/signup, redirect authenticated users to home
      setIsRedirecting(true);
      const redirectTimer = setTimeout(() => {
        router.push('/');
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, isInitialized, requireAuth, redirectTo, router, isRedirecting]);

  // Show loading state while checking authentication
  // Only show loading if not initialized OR if loading and not authenticated
  if (!isInitialized || (isLoading && !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="בודק הרשאות..." />
      </div>
    );
  }

  // For auth-required routes, only render if authenticated
  if (requireAuth && (!isAuthenticated || !user)) {
    return null; // Will redirect
  }

  // For non-auth routes (like login), only render if not authenticated
  if (!requireAuth && isAuthenticated) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

/**
 * HOC to wrap components that require authentication
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  const WrappedComponent = (props: P) => {
    return (
      <ProtectedRoute requireAuth={true}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * HOC to wrap components that should only be accessible to non-authenticated users
 */
export function withoutAuth<P extends object>(Component: React.ComponentType<P>) {
  const WrappedComponent = (props: P) => {
    return (
      <ProtectedRoute requireAuth={false}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };

  WrappedComponent.displayName = `withoutAuth(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Hook to check if user has specific permissions
 */
export function useAuthGuard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { user, isAuthenticated, isInitialized } = useAuthStore((state: any) => state) as any;

  const hasPermission = (): boolean => {
    if (!isAuthenticated || !user) return false;
    
    // Add your permission logic here
    // For now, all authenticated users have all permissions
    return true;
  };

  const requirePermission = (_permission: string): boolean => {
    const hasAccess = hasPermission();
    
    // Silent permission check - no logging in production
    return hasAccess;
  };

  return {
    user,
    isAuthenticated,
    isInitialized,
    hasPermission,
    requirePermission,
  };
}
