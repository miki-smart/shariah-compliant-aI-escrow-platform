/**
 * Bank Dashboard - Overview of pending approvals and escrow monitoring
 * Updated to match emerald/teal auth design
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { OrderListResponse } from '@/types';
import { OrderStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { FileText, Shield, TrendingUp, Clock, DollarSign, ArrowRight, CheckCircle } from 'lucide-react';
import { OrderCard } from '@/components/orders/OrderCard';

export default function BankDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const { data, isLoading: ordersLoading } = useQuery<OrderListResponse>(
    'bank-orders',
    () => apiClient.getOrders({ financing_requested: true, limit: 100 }),
    { enabled: !!user && !authLoading }
  );

  // Handle authentication and authorization
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    const userRole = user.role || (user as any).roles?.[0];
    if (userRole && userRole !== 'bank') {
      const dashboardRoutes: Record<string, string> = {
        buyer: '/buyer',
        seller: '/seller',
        delivery_provider: '/delivery',
        admin: '/admin',
      };
      router.push(dashboardRoutes[userRole] || '/');
    }
  }, [user, authLoading, router]);

  // Show loading state while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const userRole = user.role || (user as any).roles?.[0];
  if (userRole !== 'bank') {
    return null;
  }

  const isLoading = ordersLoading;

  const orders = data?.orders || [];
  
  // Orders pending bank approval
  const pendingApprovals = orders.filter((o) => o.status === OrderStatus.PENDING_BANK_APPROVAL);
  
  // Orders that have been funded (escrow locked)
  const lockedEscrows = orders.filter((o) => 
    o.status === OrderStatus.FUNDED || 
    o.status === OrderStatus.PROCESSING || 
    o.status === OrderStatus.IN_TRANSIT ||
    o.status === OrderStatus.DELIVERED
  );
  
  // Completed/Settled orders
  const completedOrders = orders.filter((o) => 
    o.status === OrderStatus.SETTLED || o.status === OrderStatus.COMPLETED
  );
  
  const totalVolume = lockedEscrows.reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <DashboardLayout role="BANK">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bank Dashboard 🏦</h1>
            <p className="text-gray-500 mt-1">Review financing requests and monitor escrow accounts.</p>
          </div>
          <Link href="/bank/orders">
            <Button variant="gradient">
              <FileText className="w-4 h-4 mr-2" />
              View All Requests
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals.length}
            icon={<Clock className="w-6 h-6 text-amber-600" />}
          />
          <StatCard
            title="Locked in Escrow"
            value={lockedEscrows.length}
            icon={<Shield className="w-6 h-6 text-blue-600" />}
          />
          <StatCard
            title="Total Volume"
            value={`ETB ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(totalVolume)}`}
            icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
            trend={{ value: 23, positive: true }}
          />
          <StatCard
            title="Completed"
            value={completedOrders.length}
            icon={<CheckCircle className="w-6 h-6 text-teal-600" />}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Pending Approvals</h3>
                <p className="text-amber-100 text-sm mb-4">
                  {pendingApprovals.length} financing requests awaiting your review.
                </p>
                <Link href="/bank/orders?status=pending">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                    Review Now
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Clock className="w-8 h-8" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Escrow Monitor</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Monitor active escrow accounts and fund releases.
                </p>
                <Link href="/bank/escrow">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                    View Escrow
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8" />
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Approvals */}
        <Card>
          <CardHeader
            title="Pending Financing Approvals"
            subtitle="Requests requiring your review"
            action={
              <Link href="/bank/orders">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            }
          />
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : pendingApprovals.length > 0 ? (
            <div className="space-y-4">
              {pendingApprovals.slice(0, 5).map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-500">No pending approvals at the moment.</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

