/**
 * Seller Dashboard - Overview of products and orders
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Order, Product } from '@/types';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { Package, FileText, Plus } from 'lucide-react';

export default function SellerDashboard() {
  const { data: orders } = useQuery<Order[]>(
    'seller-orders',
    () => apiClient.getOrders({ limit: 5 })
  );

  const { data: products } = useQuery<Product[]>(
    'seller-products',
    () => apiClient.getProducts({ limit: 5 })
  );

  const pendingOrders = orders?.filter((o) => o.status === 'BANK_PENDING' || o.status === 'ESCROW_LOCKED') || [];
  const activeProducts = products?.filter((p) => p.is_active) || [];

  return (
    <DashboardLayout role="SELLER">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your products and track orders</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Active Products</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{activeProducts.length}</div>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Pending Orders</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{pendingOrders.length}</div>
              </div>
              <FileText className="w-8 h-8 text-amber-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Quick Actions</div>
                <Link href="/seller/products/new">
                  <Button size="sm" className="mt-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
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
              <Link href="/seller/orders">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            }
          />
          {orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Amount: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.total_amount)}
                      </div>
                    </div>
                    <Link href={`/seller/orders/${order.id}`}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No orders yet</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}


