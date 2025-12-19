/**
 * Bank Order Review - Full order review with AI scores, Shariah compliance, and approval actions
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Order, OrderStatus } from '@/types';
import { OrderStatusTimeline } from '@/components/ui/OrderStatusTimeline';
import { EscrowStatusCard } from '@/components/ui/EscrowStatusCard';
import { AIScoreCard } from '@/components/ui/AIScoreCard';
import { ShariahComplianceCard } from '@/components/ui/ShariahComplianceCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export default function BankOrderReview() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');

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

  const approveMutation = useMutation(
    () => apiClient.bankApproveOrder(id as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['order', id]);
        router.push('/bank/orders');
      },
    }
  );

  const rejectMutation = useMutation(
    () => apiClient.bankRejectOrder(id as string, rejectReason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['order', id]);
        router.push('/bank/orders');
      },
    }
  );

  const canApprove = order?.status === OrderStatus.BANK_PENDING;
  const isApproved = order?.status === OrderStatus.BANK_APPROVED || order?.status === OrderStatus.ESCROW_LOCKED;

  if (!order) {
    return (
      <DashboardLayout role="BANK">
        <div className="text-center py-12">Loading order details...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="BANK">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            ← Back to Orders
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Order Review</h1>
          <p className="text-gray-600 mt-2">Order #{order.id.slice(0, 8)}</p>
        </div>

        {/* Status Timeline */}
        <Card>
          <CardHeader title="Order Status" />
          <OrderStatusTimeline currentStatus={order.status} />
        </Card>

        {/* Order Info */}
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

        {/* Compliance & Risk Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {shariahResult && <ShariahComplianceCard result={shariahResult} />}
          {aiDecision && <AIScoreCard decision={aiDecision} />}
        </div>

        {/* Escrow Status */}
        {escrow && <EscrowStatusCard escrow={escrow} />}

        {/* Approval Actions */}
        {canApprove && (
          <Card>
            <CardHeader title="Financing Decision" />
            <div className="space-y-4">
              {/* Validation Checks */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {shariahResult?.compliant ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span>Shariah Compliance: {shariahResult?.compliant ? 'Approved' : 'Rejected'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {aiDecision?.decision === 'APPROVED' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span>AI Risk Assessment: {aiDecision?.decision || 'Pending'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="primary"
                  onClick={() => approveMutation.mutate()}
                  isLoading={approveMutation.isLoading}
                  disabled={!shariahResult?.compliant || aiDecision?.decision !== 'APPROVED'}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Financing
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    const reason = prompt('Rejection reason:');
                    if (reason) {
                      setRejectReason(reason);
                      rejectMutation.mutate();
                    }
                  }}
                  isLoading={rejectMutation.isLoading}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        )}

        {isApproved && (
          <Card>
            <div className="p-4 bg-green-50 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-900 font-medium">Financing approved. Escrow is locked.</span>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}


