/**
 * Delivery Dashboard - View assigned deliveries and update status
 * Updated to use delivery-specific API endpoints
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Truck, Package, MapPin, Clock, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DeliveryDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Fetch delivery stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery(
    'delivery-stats',
    () => apiClient.getDeliveryStats(),
    { 
      enabled: !!user && !authLoading,
      retry: false,
      onError: (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Delivery] Stats error:', {
            error,
            status: error?.response?.status,
            data: error?.response?.data,
          });
        }
      }
    }
  );

  // Fetch assigned deliveries
  const { data: assignedData, isLoading: assignedLoading, error: assignedError } = useQuery(
    'assigned-deliveries',
    () => apiClient.getAssignedDeliveries(),
    { 
      enabled: !!user && !authLoading,
      retry: false,
      onError: (error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Delivery] Assigned deliveries error:', {
            error,
            status: error?.response?.status,
            data: error?.response?.data,
          });
        }
      }
    }
  );

  // Fetch pending pickup deliveries
  const { data: pendingData, error: pendingError } = useQuery(
    'pending-pickups',
    () => apiClient.getPendingPickups(),
    { 
      enabled: !!user && !authLoading,
      retry: false,
      onError: (error) => {
        // 404 or empty responses are OK - just means no pending pickups
        if (error?.response?.status !== 404 && process.env.NODE_ENV === 'development') {
          console.error('[Delivery] Pending pickups error:', {
            error,
            status: error?.response?.status,
            data: error?.response?.data,
          });
        }
      }
    }
  );

  // Fetch in-transit deliveries
  const { data: transitData, error: transitError } = useQuery(
    'in-transit-deliveries',
    () => apiClient.getInTransitDeliveries(),
    { 
      enabled: !!user && !authLoading,
      retry: false,
      onError: (error) => {
        // 404 or empty responses are OK - just means no in-transit deliveries
        if (error?.response?.status !== 404 && process.env.NODE_ENV === 'development') {
          console.error('[Delivery] In-transit deliveries error:', {
            error,
            status: error?.response?.status,
            data: error?.response?.data,
          });
        }
      }
    }
  );

  // Handle authentication and authorization
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Normalize role - handle both formats and case variations
    const userRole = (user.role || (user as any).roles?.[0] || '').toLowerCase();
    const allowedRoles = ['delivery_provider', 'delivery', 'admin'];
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Delivery Dashboard] Auth check:', {
        user,
        userRole,
        allowedRoles,
        isAllowed: allowedRoles.includes(userRole),
      });
    }
    
    if (userRole && !allowedRoles.includes(userRole)) {
      const dashboardRoutes: Record<string, string> = {
        buyer: '/buyer',
        seller: '/seller',
        bank: '/bank',
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

  // Normalize role - handle both formats and case variations
  const userRole = (user.role || (user as any).roles?.[0] || '').toLowerCase();
  const allowedRoles = ['delivery_provider', 'delivery', 'admin'];
  
  if (!allowedRoles.includes(userRole)) {
    return null;
  }

  const isLoading = statsLoading || assignedLoading;
  
  // Only show error if ALL critical endpoints fail
  const criticalErrors = [statsError, assignedError].filter(Boolean);
  const hasCriticalErrors = criticalErrors.length === 2;
  const hasPartialErrors = (statsError || assignedError || pendingError || transitError) && !hasCriticalErrors;
  
  // Use actual delivery data from API with fallbacks
  const deliveries = assignedData?.deliveries || assignedData || [];
  const inTransit = transitData?.deliveries || transitData || [];
  const pending = pendingData?.deliveries || pendingData || [];
  const completedToday = stats?.completed_today || stats?.completed || 0;
  
  // Calculate stats from data if API stats failed
  const calculatedStats = {
    total: stats?.total || deliveries.length,
    pending_pickup: stats?.pending_pickup || pending.length,
    active: stats?.active || inTransit.length,
    completed: stats?.completed || completedToday,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERY_IN_TRANSIT':
        return 'bg-blue-100 text-blue-700';
      case 'DELIVERY_PENDING':
        return 'bg-amber-100 text-amber-700';
      case 'PREPARING':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <DashboardLayout role="DELIVERY">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Delivery Dashboard 🚚</h1>
            <p className="text-gray-500 mt-1">Manage your assigned deliveries and track routes.</p>
          </div>
          <Link href="/delivery/assignments">
            <Button variant="gradient">
              <Truck className="w-4 h-4 mr-2" />
              View All Deliveries
            </Button>
          </Link>
        </div>

        {/* API Error Banner - Only show if critical endpoints fail */}
        {hasCriticalErrors && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900 mb-1">Unable to load delivery data</h3>
              <p className="text-sm text-red-700">
                Could not connect to the delivery service. Please check your connection and refresh the page.
              </p>
            </div>
          </div>
        )}
        
        {/* Partial Error Warning - Some endpoints failed but we have some data */}
        {hasPartialErrors && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-900 mb-1">Partial data loaded</h3>
              <p className="text-sm text-amber-700">
                Some delivery information could not be loaded. Showing available data below.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Assigned Deliveries"
            value={stats?.total || calculatedStats.total}
            icon={<Package className="w-6 h-6 text-violet-600" />}
          />
          <StatCard
            title="In Transit"
            value={stats?.active || calculatedStats.active}
            icon={<Truck className="w-6 h-6 text-blue-600" />}
          />
          <StatCard
            title="Pending Pickup"
            value={stats?.pending_pickup || calculatedStats.pending_pickup}
            icon={<Clock className="w-6 h-6 text-amber-600" />}
          />
          <StatCard
            title="Completed"
            value={stats?.completed || calculatedStats.completed}
            icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">In Transit</h3>
                <p className="text-blue-100 text-sm mb-4">
                  {inTransit.length} deliveries currently on the way.
                </p>
                <Link href="/delivery/assignments?status=transit">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                    View Active
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Truck className="w-8 h-8" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 border-0 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Route Planner</h3>
                <p className="text-violet-100 text-sm mb-4">
                  Optimize your delivery routes for efficiency.
                </p>
                <Link href="/delivery/routes">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                    Plan Route
                    <MapPin className="w-4 h-4" />
                  </button>
                </Link>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <MapPin className="w-8 h-8" />
              </div>
            </div>
          </Card>
        </div>

        {/* Deliveries List */}
        <Card>
          <CardHeader
            title="My Deliveries"
            subtitle="Active delivery assignments"
            action={
              <Link href="/delivery/assignments">
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
          ) : deliveries.length > 0 ? (
            <div className="space-y-4">
              {deliveries.slice(0, 5).map((delivery: any) => (
                <div key={delivery.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {delivery.tracking_number || `Delivery #${delivery.id.slice(0, 8)}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        Order: {delivery.order_number || delivery.order_id?.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                      {delivery.status.replace(/_/g, ' ')}
                    </span>
                    <Link href={`/delivery/assignments/${delivery.id}`}>
                      <Button variant="primary" size="sm">Manage</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assigned deliveries</h3>
              <p className="text-gray-500">New delivery assignments will appear here.</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

