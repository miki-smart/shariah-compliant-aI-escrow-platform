/**
 * Login Page - Modern Shariah Escrow authentication
 * Matches the registration flow design
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth-context';
import { GuestRoute } from '@/components/auth/ProtectedRoute';

function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearError();
    setIsLoading(true);

    try {
      await login(email, password, rememberMe);
      // Redirect is handled by the auth context
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick login options for demo - credentials from Keycloak realm export
  const quickLogins = [
    { role: 'Buyer', email: 'buyer@msme-retail.com', password: 'buyer123', icon: '🛒' },
    { role: 'Seller', email: 'seller@wholesale-goods.com', password: 'seller123', icon: '🏪' },
    { role: 'Bank', email: 'bank@islamicbank.com', password: 'bank123', icon: '🏦' },
    { role: 'Delivery', email: 'delivery@fastlogistics.com', password: 'delivery123', icon: '🚚' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Subtle floating shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              <span className="text-emerald-600">Sharia</span> Escrow
            </h1>
          </Link>
          <p className="text-gray-600 mt-2 text-lg">Trust & Compliance Platform</p>
        </div>

        {/* Login Card */}
        <Card className="w-full max-w-md bg-white border-gray-200 shadow-xl shadow-gray-200/50">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-500 mt-2">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <a href="#" className="text-sm text-emerald-600 hover:text-emerald-700">
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-3 rounded-xl font-medium shadow-md shadow-emerald-200 transition-all hover:shadow-lg"
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">Quick Demo Access</span>
            </div>
          </div>

          {/* Quick Login Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {quickLogins.map((option) => (
              <button
                key={option.role}
                type="button"
                onClick={() => {
                  setEmail(option.email);
                  setPassword(option.password);
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-all text-sm font-medium"
              >
                <span>{option.icon}</span>
                <span>{option.role}</span>
              </button>
            ))}
          </div>

          {/* Sign Up Link */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Create one now
              </Link>
            </p>
          </div>
        </Card>

        {/* Footer Note */}
        <p className="text-gray-400 text-xs mt-8 text-center max-w-md">
          By signing in, you agree to our Shariah compliance guidelines and Terms of Service.
          All transactions are conducted in accordance with Islamic finance principles.
        </p>
      </div>
    </div>
  );
}

// Export wrapped with GuestRoute to redirect authenticated users
export default function Login() {
  return (
    <GuestRoute>
      <LoginPage />
    </GuestRoute>
  );
}

