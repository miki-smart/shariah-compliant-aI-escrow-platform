/**
 * Bank Order Detail Page
 * Detailed view for reviewing financing requests
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import Link from 'next/link';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Shield,
  Brain,
  ChevronDown,
  ChevronUp,
  User,
  Building2,
  DollarSign,
  FileText,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { Order, OrderStatus, OrderStatusHistory } from '@/types';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  [OrderStatus.PENDING_BANK_APPROVAL]: { label: 'Pending Your Approval', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  [OrderStatus.BANK_APPROVED]: { label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  [OrderStatus.FUNDED]: { label: 'Funded', color: 'text-blue-600', bg: 'bg-blue-50', icon: DollarSign },
  [OrderStatus.PROCESSING]: { label: 'Processing', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: RefreshCw },
  [OrderStatus.IN_TRANSIT]: { label: 'In Transit', color: 'text-orange-600', bg: 'bg-orange-50', icon: Package },
  [OrderStatus.DELIVERED]: { label: 'Delivered', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  [OrderStatus.SETTLED]: { label: 'Settled', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  [OrderStatus.COMPLETED]: { label: 'Completed', color: 'text-gray-600', bg: 'bg-gray-50', icon: CheckCircle },
  [OrderStatus.CANCELLED]: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  [OrderStatus.REFUNDED]: { label: 'Refunded', color: 'text-amber-600', bg: 'bg-amber-50', icon: RefreshCw },
};

export default function BankOrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const { data: order, isLoading, error } = useQuery<Order>(
    ['order', id],
    () => apiClient.getOrder(id as string),
    { enabled: !!id }
  );

  const { data: history } = useQuery<OrderStatusHistory[]>(
    ['order-history', id],
    () => apiClient.getOrderHistory(id as string),
    { enabled: !!id && showHistory }
  );

  const approveMutation = useMutation(
    () => apiClient.bankApproveOrder(id as string, { approved: true, notes: approveNotes }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['order', id]);
        queryClient.invalidateQueries(['pending-approval-orders']);
        queryClient.invalidateQueries(['bank-orders']);
        setShowApproveModal(false);
      },
    }
  );

  const rejectMutation = useMutation(
    () => apiClient.bankRejectOrder(id as string, { approved: false, reason: rejectReason }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['order', id]);
        queryClient.invalidateQueries(['pending-approval-orders']);
        queryClient.invalidateQueries(['bank-orders']);
        setShowRejectModal(false);
      },
    }
  );

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-50', icon: Package };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <Link href="/bank/orders" className="text-emerald-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const config = getStatusConfig(order.status);
  const StatusIcon = config.icon;
  const canApprove = order.status === OrderStatus.PENDING_BANK_APPROVAL;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="bank-detail-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-200" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bank-detail-pattern)" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/bank/orders"
            className="p-2 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order {order.order_number}</h1>
            <p className="text-gray-600">Financing Request Review</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status & Actions */}
            <div className={`${config.bg} rounded-2xl p-6 border border-gray-200`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 rounded-xl bg-white/50">
                  <StatusIcon className={`w-8 h-8 ${config.color}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${config.color}`}>{config.label}</h2>
                  <p className="text-gray-600">Contract Type: {order.contract_type?.toUpperCase()}</p>
                </div>
              </div>

              {canApprove && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 px-4 py-3 bg-white text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors border border-red-200 flex items-center justify-center gap-2"
                  >
                    <ThumbsDown className="w-5 h-5" />
                    Reject Financing
                  </button>
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <ThumbsUp className="w-5 h-5" />
                    Approve Financing
                  </button>
                </div>
              )}
            </div>

            {/* Financing Summary */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-400" />
                Financing Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Total Order Value</p>
                  <p className="text-2xl font-bold text-gray-900">ETB {Number(order.total_amount).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-purple-600 mb-1">Financing Requested</p>
                  <p className="text-2xl font-bold text-purple-700">ETB {Number(order.bank_financing_amount).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600 mb-1">Buyer Down Payment</p>
                  <p className="text-xl font-bold text-blue-700">ETB {Number(order.buyer_down_payment).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-sm text-emerald-600 mb-1">Financing Ratio</p>
                  <p className="text-xl font-bold text-emerald-700">
                    {Math.round((Number(order.bank_financing_amount) / Number(order.total_amount)) * 100)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Compliance Status */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Compliance Assessment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl ${
                  order.shariah_status === 'compliant' ? 'bg-emerald-50' : 'bg-amber-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className={`w-5 h-5 ${
                      order.shariah_status === 'compliant' ? 'text-emerald-600' : 'text-amber-600'
                    }`} />
                    <span className="font-medium text-gray-900">Shariah Compliance</span>
                  </div>
                  <p className={`font-bold ${
                    order.shariah_status === 'compliant' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {order.shariah_status.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  {order.shariah_validated_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Validated: {new Date(order.shariah_validated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className={`p-4 rounded-xl ${
                  order.ai_approval_status === 'approved' ? 'bg-emerald-50' : 'bg-amber-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className={`w-5 h-5 ${
                      order.ai_approval_status === 'approved' ? 'text-emerald-600' : 'text-amber-600'
                    }`} />
                    <span className="font-medium text-gray-900">AI Risk Assessment</span>
                  </div>
                  <p className={`font-bold ${
                    order.ai_approval_status === 'approved' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {order.ai_approval_status.replace(/_/g, ' ').toUpperCase()}
                  </p>
                  {order.ai_evaluated_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Evaluated: {new Date(order.ai_evaluated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {order.product?.thumbnail_url ? (
                    <img
                      src={order.product.thumbnail_url}
                      alt={order.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">{order.product?.name}</h4>
                  <p className="text-gray-600 mb-2">Category: {order.product?.category}</p>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-gray-600">
                      Quantity: <span className="font-medium text-gray-900">{Number(order.quantity)}</span>
                    </span>
                    <span className="text-gray-600">
                      Unit Price: <span className="font-medium text-gray-900">ETB {Number(order.unit_price).toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-lg font-semibold text-gray-900">Order Timeline</h3>
                {showHistory ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showHistory && history && (
                <div className="mt-4 space-y-4">
                  {history.map((entry, index) => (
                    <div key={entry.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === history.length - 1 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        {index < history.length - 1 && <div className="w-0.5 h-full bg-gray-200 my-1" />}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-gray-900">{entry.to_status.replace(/_/g, ' ').toUpperCase()}</p>
                        <p className="text-sm text-gray-600">{entry.reason}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Buyer Info */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Buyer Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{order.buyer?.business_name || order.buyer?.full_name}</p>
                    <p className="text-sm text-gray-600">{order.buyer?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{order.seller?.business_name || order.seller?.full_name}</p>
                    <p className="text-sm text-gray-600">{order.seller?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Dates */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Dates</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Placed</span>
                  <span className="font-medium text-gray-900">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                {order.expected_delivery_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Est. Delivery</span>
                    <span className="font-medium text-gray-900">
                      {new Date(order.expected_delivery_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {order.bank_approved_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bank Approved</span>
                    <span className="font-medium text-emerald-600">
                      {new Date(order.bank_approved_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Notes</h3>
                <p className="text-gray-600 text-sm">{order.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Approve Financing</h3>
            <div className="bg-emerald-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-emerald-800 mb-1">Financing Amount</p>
              <p className="text-2xl font-bold text-emerald-700">
                ETB {Number(order.bank_financing_amount).toLocaleString()}
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Add any notes..."
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isLoading}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {approveMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Financing</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="E.g., Insufficient credit history..."
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                rows={3}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {rejectMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
