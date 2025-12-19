/**
 * Registration Success Page
 * Shown after successful registration with verification info
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function RegistrationSuccess() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const pendingEmail = localStorage.getItem('pending_verification');
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
  }, []);

  const handleResendVerification = async () => {
    setResending(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResent(true);
    } finally {
      setResending(false);
    }
  };

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
        {/* Success Card */}
        <Card className="w-full max-w-lg bg-white border-gray-200 shadow-xl shadow-gray-200/50 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registration Successful!
          </h1>
          <p className="text-gray-500 text-lg">
            Welcome to Sharia Escrow
          </p>

          {/* Verification Notice */}
          <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-lg font-medium text-emerald-800">Check Your Email</span>
            </div>
            <p className="text-gray-600 text-sm">
              We&apos;ve sent a verification link to:
            </p>
            <p className="text-gray-900 font-medium mt-2 text-lg">
              {email || 'your email address'}
            </p>
            <p className="text-gray-500 text-sm mt-4">
              Please click the link in the email to verify your account and complete the registration.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 space-y-4">
            <Link href="/login">
              <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-3 rounded-xl font-medium shadow-md shadow-emerald-200 transition-all hover:shadow-lg">
                Continue to Login
              </Button>
            </Link>

            {!resent ? (
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="w-full py-3 text-gray-500 hover:text-emerald-600 font-medium transition-colors disabled:opacity-50"
              >
                {resending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  "Didn't receive email? Resend verification"
                )}
              </button>
            ) : (
              <p className="text-emerald-600 font-medium py-3">
                ✓ Verification email resent successfully
              </p>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-gray-400 text-sm">
              Need help? Contact{' '}
              <a href="mailto:support@shariaescrow.com" className="text-emerald-600 hover:text-emerald-700">
                support@shariaescrow.com
              </a>
            </p>
          </div>
        </Card>

        {/* What's Next Section */}
        <div className="w-full max-w-lg mt-8">
          <h3 className="text-gray-500 text-sm font-medium mb-4 text-center">What happens next?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-emerald-600 font-bold text-sm">1</span>
              </div>
              <p className="text-gray-900 text-sm font-medium">Verify Email</p>
              <p className="text-gray-400 text-xs mt-1">Click the link we sent</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-gray-500 font-bold text-sm">2</span>
              </div>
              <p className="text-gray-900 text-sm font-medium">Sign In</p>
              <p className="text-gray-400 text-xs mt-1">Access your dashboard</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-gray-500 font-bold text-sm">3</span>
              </div>
              <p className="text-gray-900 text-sm font-medium">Start Trading</p>
              <p className="text-gray-400 text-xs mt-1">Secure transactions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
