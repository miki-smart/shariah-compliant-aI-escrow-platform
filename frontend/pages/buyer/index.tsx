/**
 * Buyer Dashboard - Overview of orders and products
 * Updated to match emerald/teal auth design
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { OrderCard } from '@/components/orders/OrderCard';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Order } from '@/types';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { ShoppingBag, FileText, TrendingUp, Clock, ArrowRight, Package } from 'lucide-react';

export default function BuyerDashboard() {
  const { data: orders, isLoading } = useQuery<Order[]>(
    'buyer-orders',
    () => apiClient.getOrders({ limit: 5 })
  );

  const activeOrders = orders?.filter(
    (o) => !o.status.includes('REJECTED') && o.status !== 'ESCROW_RELEASED' && o.status !== 'CANCELLED'
  ) || [];
  const completedOrders = orders?.filter((o) => o.status === 'ESCROW_RELEASED') || [];
  const pendingOrders = orders?.filter((o) => o.status === 'BANK_PENDING') || [];

  return (
    <DashboardLayout role="BUYER">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back! 👋</h1>
            <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your orders today.</p>
          </div>
          <Link href="/buyer/products">
            <Button variant="gradient">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Browse Products
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Active Orders"
            value={activeOrders.length}
            icon={<FileText className="w-6 h-6 text-emerald-600" />}
            trend={{ value: 12, positive: true }}
          />
          <StatCard
            title="Pending Approval"
            value={pendingOrders.length}
            icon={<Clock className="w-6 h-6 text-amber-600" />}
          />
          <StatCard
            title="Completed"
            value={completedOrders.length}
            icon={<TrendingUp className="w-6 h-6 text-teal-600" />}
            trend={{ value: 8, positive: true }}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Browse Products</h3>
                <p className="text-emerald-100 text-sm mb-4">
                  Discover Shariah-compliant products from verified sellers.
                </p>
                <Link href="/buyer/products">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                    Start Shopping
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Package className="w-8 h-8" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Track Orders</h3>
                <p className="text-blue-100 text-sm mb-4">
                  View real-time status updates on your orders.
                </p>
                <Link href="/buyer/orders">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                    View Orders
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader
            title="Recent Orders"
            subtitle="Your latest transactions"
            action={
              <Link href="/buyer/orders">
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
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-500 mb-6">Start browsing products to make your first order.</p>
              <Link href="/buyer/products">
                <Button variant="gradient">Browse Products</Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

