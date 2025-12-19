/**
 * Fund Escrow Page - Buyer funds escrow for an order
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import type { Order, Escrow, EscrowOperationResult } from '@/types';
import { 
  ArrowLeft, 
  Wallet, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Shield,
  Lock
} from 'lucide-react';

export default function FundEscrowPage() {
  const router = useRouter();
  const { id: orderId } = router.query;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<EscrowOperationResult | null>(null);
  const [bankReference, setBankReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (orderId && typeof orderId === 'string') {
      fetchOrderData(orderId);
    }
  }, [orderId]);

  const fetchOrderData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const orderData = await apiClient.getOrder(id);
      setOrder(orderData);
      
      // Try to get existing escrow
      try {
        const escrowData = await apiClient.getEscrow(id);
        setEscrow(escrowData);
      } catch (e) {
        // Escrow doesn't exist yet, which is expected
        setEscrow(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleFundEscrow = async () => {
    if (!order || !orderId) return;
    
    try {
      setFunding(true);
      setError(null);
      
      const result = await apiClient.fundEscrow(orderId as string, {
        amount: order.total_amount,
        bank_reference: bankReference || undefined,
        notes: notes || undefined,
      });
      
      setSuccess(result);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/buyer/orders/${orderId}`);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fund escrow');
    } finally {
      setFunding(false);
    }
  };

  const canFund = order && (!escrow || escrow.status === 'pending');

  if (loading) {
    return (
      <DashboardLayout role="BUYER">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="BUYER">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-500 mb-4">{error || 'The order you are looking for does not exist.'}</p>
          <Link href="/buyer/orders">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="BUYER">
      <Head>
        <title>Fund Escrow | Shariah Escrow</title>
      </Head>

      <div className="max-w-2xl mx-auto">
        {/* Back Link */}
        <Link href={`/buyer/orders/${orderId}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Order
        </Link>

        {/* Success State */}
        {success ? (
          <Card className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Escrow Funded Successfully!</h2>
            <p className="text-gray-600 mb-4">{success.message}</p>
            {success.transaction && (
              <p className="text-sm text-gray-500">
                Transaction Reference: <span className="font-mono">{success.transaction.reference_number}</span>
              </p>
            )}
            <p className="text-sm text-gray-500 mt-4">Redirecting to order details...</p>
          </Card>
        ) : (
          <>
            {/* Header Card */}
            <Card className="mb-6">
              <CardHeader 
                title="Fund Escrow Account"
                subtitle="Secure your payment in a Shariah-compliant escrow"
              />
              
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg mb-6">
                <Shield className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Secure & Compliant</p>
                  <p className="text-xs text-blue-700">
                    Your funds are protected and will only be released when all conditions are met
                  </p>
                </div>
              </div>

              {/* Order Summary */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Order Summary</h3>
                
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Order ID</p>
                    <p className="font-mono text-sm">{order.id.slice(0, 8)}...</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <StatusBadge 
                      label={order.status} 
                      color="text-blue-700" 
                      bgColor="bg-blue-100" 
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="font-medium">{order.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Product</p>
                    <p className="font-medium truncate">{order.product_id.slice(0, 8)}...</p>
                  </div>
                </div>

                {/* Amount to Fund */}
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 mb-1">Amount to Fund</p>
                  <p className="text-3xl font-bold text-green-900">
                    {formatCurrency(order.total_amount)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    This amount will be held in escrow until delivery is confirmed
                  </p>
                </div>

                {/* Optional Fields */}
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Reference (Optional)
                    </label>
                    <input
                      type="text"
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value)}
                      placeholder="Enter bank reference number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes for this transaction"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Unable to Fund Escrow</p>
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  </div>
                )}

                {/* Escrow Already Funded */}
                {escrow && escrow.status !== 'pending' && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Escrow Already Funded</p>
                      <p className="text-sm text-yellow-600">
                        This order&apos;s escrow is already {escrow.status}. No action needed.
                      </p>
                    </div>
                  </div>
                )}

                {/* Fund Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleFundEscrow}
                    disabled={!canFund || funding}
                    className="w-full"
                    variant="primary"
                  >
                    {funding ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Fund Escrow - {formatCurrency(order.total_amount)}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    By clicking, you agree to lock these funds in escrow
                  </p>
                </div>
              </div>
            </Card>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Shariah Compliant</h4>
                    <p className="text-sm text-gray-500">
                      Transaction follows Islamic finance principles
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Secure Escrow</h4>
                    <p className="text-sm text-gray-500">
                      Funds released only after delivery confirmation
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
