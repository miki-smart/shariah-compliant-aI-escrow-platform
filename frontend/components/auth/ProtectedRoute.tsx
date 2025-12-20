/**
 * Protected Route Component
 * Wraps pages that require authentication
 */
import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Store the attempted URL for redirect after login
        sessionStorage.setItem('redirectAfterLogin', router.asPath);
        router.replace(redirectTo);
        return;
      }

      // Check role-based access
      if (allowedRoles && user) {
        // Support both user.role (backend) and user.roles (legacy)
        // Normalize to lowercase for consistency
        const userRole = (user.role || user.roles?.[0] || '').toLowerCase();
        if (userRole && !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
          // Redirect to user's appropriate dashboard
          const dashboardRoutes: Record<string, string> = {
            buyer: '/buyer',
            seller: '/seller',
            bank: '/bank',
            delivery_provider: '/delivery',
            delivery: '/delivery', // Handle both formats
            admin: '/admin',
          };
          router.replace(dashboardRoutes[userRole] || '/');
        }
      }
    }
  }, [isLoading, isAuthenticated, user, router, allowedRoles, redirectTo]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-emerald-600 text-xl">☪</span>
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
          <p className="mt-1 text-gray-400 text-sm">Verifying your session</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Role not allowed
  if (allowedRoles && user) {
    const userRole = (user.role || user.roles?.[0] || '').toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
    if (userRole && !normalizedAllowedRoles.includes(userRole)) {
      return null;
    }
  }

  return <>{children}</>;
}

/**
 * Guest Route Component
 * For pages that should only be accessible to non-authenticated users (login, register)
 */
interface GuestRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function GuestRoute({ 
  children, 
  redirectTo 
}: GuestRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Redirect authenticated users to their dashboard
      const destination = redirectTo || (() => {
        // Support both user.role (backend) and user.roles (legacy)
        // Normalize to lowercase for consistency
        const userRole = (user.role || user.roles?.[0] || 'buyer').toLowerCase();
        const dashboardRoutes: Record<string, string> = {
          buyer: '/buyer',
          seller: '/seller',
          bank: '/bank',
          delivery_provider: '/delivery',
          delivery: '/delivery', // Handle both formats
          admin: '/admin',
        };
        return dashboardRoutes[userRole] || '/buyer';
      })();
      
      router.replace(typeof destination === 'function' ? destination : destination);
    }
  }, [isLoading, isAuthenticated, user, router, redirectTo]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Already authenticated
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

