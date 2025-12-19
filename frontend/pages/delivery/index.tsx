/**
 * Delivery Dashboard - View assigned deliveries and update status
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Order } from '@/types';
import { OrderStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { Truck, Package } from 'lucide-react';
import Link from 'next/link';

export default function DeliveryDashboard() {
  const { data: orders } = useQuery<Order[]>(
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

  return (
    <DashboardLayout role="DELIVERY">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your delivery assignments</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Assigned Deliveries</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{assignedDeliveries.length}</div>
              </div>
              <Truck className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">In Transit</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {assignedDeliveries.filter((o) => o.status === OrderStatus.DELIVERY_IN_TRANSIT).length}
                </div>
              </div>
              <Package className="w-8 h-8 text-amber-500" />
            </div>
          </Card>
        </div>

        {/* Deliveries List */}
        <div>
          <CardHeader title="My Deliveries" />
          {assignedDeliveries.length > 0 ? (
            <div className="space-y-4">
              {assignedDeliveries.map((order) => (
                <Card key={order.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Status: {order.status.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-600">
                        Amount: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.total_amount)}
                      </div>
                    </div>
                    <Link href={`/delivery/assignments/${order.id}`}>
                      <Button variant="outline" size="sm">Manage</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No assigned deliveries</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}


