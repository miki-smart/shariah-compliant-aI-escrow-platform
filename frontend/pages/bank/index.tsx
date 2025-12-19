/**
 * Bank Dashboard - Overview of pending approvals and escrow monitoring
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Order, Escrow } from '@/types';
import { OrderStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { FileText, Shield, TrendingUp } from 'lucide-react';
import { OrderCard } from '@/components/orders/OrderCard';

export default function BankDashboard() {
  const { data: orders } = useQuery<Order[]>(
    'bank-orders',
    () => apiClient.getOrders()
  );

  const pendingApprovals = orders?.filter((o) => o.status === OrderStatus.BANK_PENDING) || [];
  const lockedEscrows = orders?.filter((o) => o.status === OrderStatus.ESCROW_LOCKED) || [];

  return (
    <DashboardLayout role="BANK">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Dashboard</h1>
          <p className="text-gray-600 mt-2">Review financing requests and monitor escrow</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Pending Approvals</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{pendingApprovals.length}</div>
              </div>
              <FileText className="w-8 h-8 text-amber-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Locked Escrows</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{lockedEscrows.length}</div>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Total Volume</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
                    lockedEscrows.reduce((sum, o) => sum + o.total_amount, 0)
                  )}
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Pending Approvals */}
        <div>
          <CardHeader
            title="Pending Financing Approvals"
            action={
              <Link href="/bank/orders">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            }
          />
          {pendingApprovals.length > 0 ? (
            <div className="space-y-4">
              {pendingApprovals.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No pending approvals</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}


