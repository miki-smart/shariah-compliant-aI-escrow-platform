/**
 * Authentication Context
 * Provides auth state and methods throughout the app
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from './api-client';
import type { User, UserRole } from '@/types';

// Auth state interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth context interface
interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  verifyEmail: (token: string) => Promise<{ success: boolean; message: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message: string }>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// Registration data interface
interface RegisterData {
  email: string;
  password: string;
  confirm_password: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
  company_name?: string;
  business_license?: string;
  address?: string;
  city?: string;
  country?: string;
  shariah_acknowledged: boolean;
  terms_accepted: boolean;
}

// Create context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token storage keys
const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to parse API error detail into a string message
function parseErrorDetail(detail: any): string {
  if (!detail) return '';
  
  // If it's already a string, return it
  if (typeof detail === 'string') return detail;
  
  // If it's an array (Pydantic validation errors)
  if (Array.isArray(detail)) {
    return detail
      .map((e: any) => e.msg || e.message || (typeof e === 'string' ? e : JSON.stringify(e)))
      .join('. ');
  }
  
  // If it's an object with a message property
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  
  return String(detail);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Get stored tokens
  const getAccessToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }, []);

  const getRefreshToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }, []);

  // Store tokens
  const storeTokens = useCallback((accessToken: string, refreshToken?: string | null) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }, []);

  // Clear tokens
  const clearTokens = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Store user data
  const storeUser = useCallback((user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, []);

  // Get stored user
  const getStoredUser = useCallback((): User | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(USER_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // Refresh user data from API
  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const user = await apiClient.getCurrentUser();
      storeUser(user);
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      // Token might be expired, try refresh
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const response = await apiClient.refreshTokens(refreshToken);
          storeTokens(response.token, response.refresh_token);
          storeUser(response.user);
          setState({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        } catch {
          // Refresh failed, clear tokens
        }
      }
      
      clearTokens();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [getAccessToken, getRefreshToken, storeTokens, storeUser, clearTokens]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      const storedUser = getStoredUser();

      if (token && storedUser) {
        // Use stored user immediately for faster UX
        setState({
          user: storedUser,
          isAuthenticated: true,
          isLoading: true,
          error: null,
        });
        
        // Then verify with server
        await refreshUser();
      } else if (token) {
        // Token exists but no user, fetch user
        await refreshUser();
      } else {
        // No token, not authenticated
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    };

    initAuth();
  }, [getAccessToken, getStoredUser, refreshUser]);

  // Login
  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.login(email, password, rememberMe);
      
      storeTokens(response.token, response.refresh_token);
      storeUser(response.user);
      
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Redirect based on role
      const dashboardRoutes: Record<string, string> = {
        buyer: '/buyer',
        seller: '/seller',
        bank: '/bank',
        delivery_provider: '/delivery',
        delivery: '/delivery', // Handle both formats
        admin: '/admin',
      };
      
      // Handle both 'role' (string) and 'roles' (array) formats
      // Normalize to lowercase for consistency
      const role = (response.user.role || response.user.roles?.[0] || 'buyer').toLowerCase();
      const redirectPath = dashboardRoutes[role] || '/buyer';
      
      // Debug logging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] Login successful:', {
          userRole: response.user.role,
          normalizedRole: role,
          redirectPath,
          user: response.user,
        });
      }
      
      router.push(redirectPath);
    } catch (error: any) {
      let message = 'Login failed. Please check your credentials.';
      
      // Handle connection errors
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
        message = 'Cannot connect to server. Please ensure the backend is running on http://localhost:8000';
      } else if (error?.response?.data?.detail) {
        // Use backend error message
        message = parseErrorDetail(error.response.data.detail);
      } else if (error?.message) {
        message = error.message;
      }
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.error('[Auth] Login error:', {
          error,
          code: error?.code,
          response: error?.response,
          status: error?.response?.status,
          data: error?.response?.data,
          message,
        });
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error; // Re-throw original error to preserve response data
    }
  }, [router, storeTokens, storeUser]);

  // Register
  const register = useCallback(async (data: RegisterData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiClient.register(data);
      
      setState(prev => ({ ...prev, isLoading: false }));
      
      // Store email for verification page
      localStorage.setItem('pending_verification', data.email);
      
      return {
        success: true,
        message: response.message || 'Registration successful. Please check your email.',
      };
    } catch (error: any) {
      const message = parseErrorDetail(error?.response?.data?.detail) || 'Registration failed. Please try again.';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      return { success: false, message };
    }
  }, []);

  // Logout
  const logout = useCallback(() => {
    clearTokens();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    router.push('/login');
  }, [clearTokens, router]);

  // Verify email
  const verifyEmail = useCallback(async (token: string) => {
    try {
      const response = await apiClient.verifyEmail(token);
      return { success: true, message: response.message };
    } catch (error: any) {
      const message = parseErrorDetail(error?.response?.data?.detail) || 'Verification failed.';
      return { success: false, message };
    }
  }, []);

  // Resend verification
  const resendVerification = useCallback(async (email: string) => {
    try {
      const response = await apiClient.resendVerification(email);
      return { success: true, message: response.message };
    } catch (error: any) {
      const message = parseErrorDetail(error?.response?.data?.detail) || 'Failed to resend verification.';
      return { success: false, message };
    }
  }, []);

  // Forgot password
  const forgotPassword = useCallback(async (email: string) => {
    try {
      const response = await apiClient.forgotPassword(email);
      return { success: true, message: response.message };
    } catch (error: any) {
      const message = parseErrorDetail(error?.response?.data?.detail) || 'Failed to send reset email.';
      return { success: false, message };
    }
  }, []);

  // Reset password
  const resetPassword = useCallback(async (token: string, password: string) => {
    try {
      const response = await apiClient.resetPassword(token, password);
      return { success: true, message: response.message };
    } catch (error: any) {
      const message = parseErrorDetail(error?.response?.data?.detail) || 'Password reset failed.';
      return { success: false, message };
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    refreshUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected pages
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles?: string[]
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.replace('/login');
      }

      if (!isLoading && isAuthenticated && allowedRoles && user) {
        // Support both user.role (backend) and user.roles (legacy)
        const userRole = user.role || user.roles?.[0];
        if (userRole && !allowedRoles.includes(userRole)) {
          // Redirect to appropriate dashboard
          const dashboardRoutes: Record<string, string> = {
            buyer: '/buyer',
            seller: '/seller',
            bank: '/bank',
            delivery_provider: '/delivery',
            admin: '/admin',
          };
          router.replace(dashboardRoutes[userRole] || '/buyer');
        }
      }
    }, [isLoading, isAuthenticated, user, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

