/**
 * Generic Order Detail Page
 * Redirects to the appropriate role-based order page
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function OrderDetailRedirect() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !id) return;

    if (!user) {
      // Not authenticated, redirect to login
      router.replace(`/login?redirect=/orders/${id}`);
      return;
    }

    // Get user role and redirect to appropriate detail page
    const userRole = user.role || (user as any).roles?.[0];
    
    const roleRoutes: Record<string, string> = {
      buyer: `/buyer/orders/${id}`,
      seller: `/seller/orders/${id}`,
      bank: `/bank/orders/${id}`,
      delivery_provider: `/delivery/orders/${id}`,
      admin: `/admin/orders/${id}`,
    };

    const redirectPath = roleRoutes[userRole] || `/buyer/orders/${id}`;
    router.replace(redirectPath);
  }, [id, user, authLoading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading order details...</p>
      </div>
    </div>
  );
}

