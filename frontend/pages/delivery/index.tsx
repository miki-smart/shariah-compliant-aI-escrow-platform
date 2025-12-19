/**
 * Delivery Dashboard - View assigned deliveries and update status
 * Updated to match emerald/teal auth design
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Order } from '@/types';
import { OrderStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { Truck, Package, MapPin, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DeliveryDashboard() {
  const { data: orders, isLoading } = useQuery<Order[]>(
    'delivery-orders',
    () => apiClient.getOrders()
  );

  // Filter orders that are in delivery stages
  const assignedDeliveries = orders?.filter(
    (o) =>
      o.status === OrderStatus.DELIVERY_PENDING ||
      o.status === OrderStatus.DELIVERY_IN_TRANSIT ||
      o.status === OrderStatus.PREPARING
  ) || [];

  const inTransit = assignedDeliveries.filter((o) => o.status === OrderStatus.DELIVERY_IN_TRANSIT);
  const pending = assignedDeliveries.filter((o) => o.status === OrderStatus.DELIVERY_PENDING);
  const completed = orders?.filter((o) => o.status === OrderStatus.ESCROW_RELEASED) || [];

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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Assigned Deliveries"
            value={assignedDeliveries.length}
            icon={<Package className="w-6 h-6 text-violet-600" />}
          />
          <StatCard
            title="In Transit"
            value={inTransit.length}
            icon={<Truck className="w-6 h-6 text-blue-600" />}
          />
          <StatCard
            title="Pending Pickup"
            value={pending.length}
            icon={<Clock className="w-6 h-6 text-amber-600" />}
          />
          <StatCard
            title="Completed Today"
            value={completed.length}
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
          ) : assignedDeliveries.length > 0 ? (
            <div className="space-y-4">
              {assignedDeliveries.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-500">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.total_amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <Link href={`/delivery/assignments/${order.id}`}>
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

