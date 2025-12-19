/**
 * Buyer Dashboard - Overview of orders and products
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { OrderCard } from '@/components/orders/OrderCard';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Order } from '@/types';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ShoppingBag, FileText, TrendingUp } from 'lucide-react';

export default function BuyerDashboard() {
  const { data: orders, isLoading } = useQuery<Order[]>(
    'buyer-orders',
    () => apiClient.getOrders({ limit: 5 })
  );

  const activeOrders = orders?.filter(
    (o) => !o.status.includes('REJECTED') && o.status !== 'ESCROW_RELEASED' && o.status !== 'CANCELLED'
  ) || [];
  const completedOrders = orders?.filter((o) => o.status === 'ESCROW_RELEASED') || [];

  return (
    <DashboardLayout role="BUYER">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Buyer Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your orders and browse products</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Active Orders</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{activeOrders.length}</div>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Completed</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{completedOrders.length}</div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Quick Actions</div>
                <Link href="/buyer/products">
                  <Button size="sm" className="mt-2">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Browse Products
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Orders */}
        <div>
          <CardHeader
            title="Recent Orders"
            action={
              <Link href="/buyer/orders">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            }
          />
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading orders...</div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No orders yet</p>
              <Link href="/buyer/products">
                <Button className="mt-4">Browse Products</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}


