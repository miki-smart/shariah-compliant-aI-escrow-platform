/**
 * Buyer Order Details - Full order view with status, escrow, AI, and Shariah info
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Order } from '@/types';
import { OrderStatusTimeline } from '@/components/ui/OrderStatusTimeline';
import { EscrowStatusCard } from '@/components/ui/EscrowStatusCard';
import { AIScoreCard } from '@/components/ui/AIScoreCard';
import { ShariahComplianceCard } from '@/components/ui/ShariahComplianceCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

export default function BuyerOrderDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [isConfirming, setIsConfirming] = useState(false);

  const { data: order } = useQuery<Order>(
    ['order', id],
    () => apiClient.getOrder(id as string),
    { enabled: !!id }
  );

  const { data: escrow } = useQuery(
    ['escrow', id],
    () => apiClient.getEscrow(id as string),
    { enabled: !!id }
  );

  const { data: aiDecision } = useQuery(
    ['ai-decision', id],
    () => apiClient.getAIDecision(id as string),
    { enabled: !!id }
  );

  const { data: shariahResult } = useQuery(
    ['shariah-result', id],
    () => apiClient.getShariahResult(id as string),
    { enabled: !!id }
  );

  const canConfirmDelivery =
    order?.status === OrderStatus.DELIVERED || order?.status === OrderStatus.DELIVERY_PENDING;

  const handleConfirmDelivery = async (confirmed: boolean) => {
    if (!id) return;
    setIsConfirming(true);
    try {
      await apiClient.confirmDelivery(id as string, confirmed);
      router.reload();
    } catch (error) {
      console.error('Failed to confirm delivery:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!order) {
    return (
      <DashboardLayout role="BUYER">
        <div className="text-center py-12">Loading order details...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="BUYER">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            ← Back to Orders
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Order Details</h1>
          <p className="text-gray-600 mt-2">Order #{order.id.slice(0, 8)}</p>
        </div>

        {/* Status Timeline */}
        <Card>
          <CardHeader title="Order Status" />
          <OrderStatusTimeline currentStatus={order.status} />
        </Card>

        {/* Order Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Order Information" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Quantity:</span>
                <span className="font-semibold text-gray-900">{order.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span className="font-semibold text-gray-900">{formatDate(order.created_at)}</span>
              </div>
              {order.financing_requested === 'true' && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Islamic Financing Requested</div>
                </div>
              )}
            </div>
          </Card>

          {/* Delivery Confirmation */}
          {canConfirmDelivery && (
            <Card>
              <CardHeader title="Delivery Confirmation" />
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Please confirm that you have received the order as expected.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={() => handleConfirmDelivery(true)}
                    isLoading={isConfirming}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirm Delivery
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => handleConfirmDelivery(false)}
                    isLoading={isConfirming}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Compliance & Risk Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {shariahResult && <ShariahComplianceCard result={shariahResult} />}
          {aiDecision && <AIScoreCard decision={aiDecision} />}
        </div>

        {/* Escrow Status */}
        {escrow && <EscrowStatusCard escrow={escrow} />}
      </div>
    </DashboardLayout>
  );
}


