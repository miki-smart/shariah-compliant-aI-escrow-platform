/**
 * Buyer Orders - List all buyer orders
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrderCard } from '@/components/orders/OrderCard';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Order } from '@/types';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { OrderStatus } from '@/types';

export default function BuyerOrders() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();

  const { data: orders, isLoading } = useQuery<Order[]>(
    'buyer-orders',
    () => apiClient.getOrders()
  );

  const filteredOrders = statusFilter
    ? orders?.filter((o) => o.status === statusFilter)
    : orders;

  const statusCounts = {
    active: orders?.filter((o) => !o.status.includes('REJECTED') && o.status !== 'ESCROW_RELEASED' && o.status !== 'CANCELLED').length || 0,
    completed: orders?.filter((o) => o.status === 'ESCROW_RELEASED').length || 0,
    rejected: orders?.filter((o) => o.status.includes('REJECTED')).length || 0,
  };

  return (
    <DashboardLayout role="BUYER">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-2">Track your order status and delivery</p>
        </div>

        {/* Status Filters */}
        <Card padding="sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <Button
              variant={!statusFilter ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(undefined)}
            >
              All ({orders?.length || 0})
            </Button>
            <Button
              variant={statusFilter === OrderStatus.ESCROW_LOCKED ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(OrderStatus.ESCROW_LOCKED)}
            >
              Active ({statusCounts.active})
            </Button>
            <Button
              variant={statusFilter === OrderStatus.ESCROW_RELEASED ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(OrderStatus.ESCROW_RELEASED)}
            >
              Completed ({statusCounts.completed})
            </Button>
          </div>
        </Card>

        {/* Orders List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading orders...</div>
        ) : filteredOrders && filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No orders found</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}



