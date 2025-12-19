/**
 * Seller Dashboard - Overview of products and orders
 * Updated to match emerald/teal auth design
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Order, Product } from '@/types';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Package, FileText, Plus, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';

export default function SellerDashboard() {
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>(
    'seller-orders',
    () => apiClient.getOrders({ limit: 5 })
  );

  const { data: products } = useQuery<Product[]>(
    'seller-products',
    () => apiClient.getProducts({ limit: 5 })
  );

  const pendingOrders = orders?.filter((o) => o.status === 'BANK_PENDING' || o.status === 'ESCROW_LOCKED') || [];
  const activeProducts = products?.filter((p) => p.is_active) || [];
  const totalRevenue = orders?.filter((o) => o.status === 'ESCROW_RELEASED')
    .reduce((sum, o) => sum + o.total_amount, 0) || 0;

  return (
    <DashboardLayout role="SELLER">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard 🏪</h1>
            <p className="text-gray-500 mt-1">Manage your products and track your sales.</p>
          </div>
          <Link href="/seller/products/new">
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Active Products"
            value={activeProducts.length}
            icon={<Package className="w-6 h-6 text-blue-600" />}
          />
          <StatCard
            title="Pending Orders"
            value={pendingOrders.length}
            icon={<FileText className="w-6 h-6 text-amber-600" />}
          />
          <StatCard
            title="Total Revenue"
            value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRevenue)}
            icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
            trend={{ value: 15, positive: true }}
          />
          <StatCard
            title="Completed Orders"
            value={orders?.filter((o) => o.status === 'ESCROW_RELEASED').length || 0}
            icon={<TrendingUp className="w-6 h-6 text-teal-600" />}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 border-0 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Manage Products</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Add, edit, or remove products from your catalog.
                </p>
                <Link href="/seller/products">
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
                    View Products
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Package className="w-8 h-8" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">View Orders</h3>
                <p className="text-emerald-100 text-sm mb-4">
                  Track and manage incoming customer orders.
                </p>
                <Link href="/seller/orders">
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
            subtitle="Latest customer orders"
            action={
              <Link href="/seller/orders">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            }
          />
          {ordersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-500">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.total_amount)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'ESCROW_RELEASED' 
                        ? 'bg-emerald-100 text-emerald-700'
                        : order.status === 'BANK_PENDING'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <Link href={`/seller/orders/${order.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-500">Orders will appear here once customers start purchasing.</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

