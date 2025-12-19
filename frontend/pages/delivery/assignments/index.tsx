/**
 * Delivery Assignments - List all assigned deliveries
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Delivery } from '@/types';
import { 
  Truck, Package, MapPin, Clock, CheckCircle, AlertCircle,
  Filter, RefreshCw, ArrowRight, Phone, Navigation
} from 'lucide-react';
import Link from 'next/link';

type DeliveryStatus = 'all' | 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';

const statusOptions: { value: DeliveryStatus; label: string; color: string }[] = [
  { value: 'all', label: 'All Deliveries', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'assigned', label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
  { value: 'picked_up', label: 'Picked Up', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'in_transit', label: 'In Transit', color: 'bg-purple-100 text-purple-700' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-orange-100 text-orange-700' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-700' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-700' },
];

const getStatusColor = (status: string): string => {
  const option = statusOptions.find(o => o.value === status);
  return option?.color || 'bg-gray-100 text-gray-700';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4" />;
    case 'assigned':
      return <Package className="w-4 h-4" />;
    case 'picked_up':
      return <Truck className="w-4 h-4" />;
    case 'in_transit':
      return <Navigation className="w-4 h-4" />;
    case 'out_for_delivery':
      return <MapPin className="w-4 h-4" />;
    case 'delivered':
      return <CheckCircle className="w-4 h-4" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

export default function DeliveryAssignments() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus>('all');
  const [page, setPage] = useState(1);

  // Fetch deliveries
  const { data, isLoading, refetch } = useQuery(
    ['assigned-deliveries', statusFilter, page],
    () => apiClient.getAssignedDeliveries({
      status: statusFilter === 'all' ? undefined : statusFilter,
      page,
      page_size: 20,
    }),
    { 
      enabled: !!user && !authLoading,
      retry: false,
      onError: () => {}
    }
  );

  // Fetch stats
  const { data: stats } = useQuery(
    'delivery-stats',
    () => apiClient.getDeliveryStats(),
    { 
      enabled: !!user && !authLoading,
      retry: false,
      onError: () => {}
    }
  );

  // Handle authentication
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    const userRole = user.role || (user as any).roles?.[0];
    if (userRole && userRole !== 'delivery_provider' && userRole !== 'admin') {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const deliveries = data?.deliveries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <DashboardLayout role="DELIVERY">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
            <p className="text-gray-500 mt-1">Manage and track your assigned deliveries</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_pickup}</p>
                  <p className="text-sm text-gray-500">Pending Pickup</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  <p className="text-sm text-gray-500">Active</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500 mr-2">Filter:</span>
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setStatusFilter(option.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === option.value
                    ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Deliveries List */}
        <Card>
          <CardHeader
            title="Deliveries"
            subtitle={`${total} total deliveries`}
          />
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : deliveries.length > 0 ? (
            <div className="space-y-4">
              {deliveries.map((delivery: Delivery) => (
                <div
                  key={delivery.id}
                  className="bg-gray-50 rounded-xl border border-gray-100 p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        {getStatusIcon(delivery.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">
                            {delivery.tracking_number || `#${delivery.id.slice(0, 8)}`}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                            {delivery.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          Order: {delivery.order_number || delivery.order_id?.slice(0, 8)}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          {delivery.delivery_address && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="truncate max-w-[200px]">
                                {typeof delivery.delivery_address === 'object' 
                                  ? (delivery.delivery_address as any).city || (delivery.delivery_address as any).address
                                  : delivery.delivery_address}
                              </span>
                            </div>
                          )}
                          {delivery.estimated_delivery && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>ETA: {new Date(delivery.estimated_delivery).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/delivery/assignments/${delivery.id}`}>
                        <Button variant="primary" size="sm">
                          Manage
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No deliveries found</h3>
              <p className="text-gray-500">
                {statusFilter !== 'all' 
                  ? `No ${statusFilter.replace(/_/g, ' ')} deliveries at the moment.`
                  : 'You have no assigned deliveries yet.'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
