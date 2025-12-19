/**
 * Seller Order Detail Page
 * View order details and process orders (accept/reject/ship)
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
  Truck,
  Building2,
  FileCheck,
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
  Calendar,
  RefreshCw,
  DollarSign,
  Send,
  Ban,
  Camera,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { Order, OrderStatus, OrderStatusHistory, SellerProcessRequest } from '@/types';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType; description: string }> = {
  [OrderStatus.CREATED]: { label: 'New Order', color: 'text-blue-600', bg: 'bg-blue-50', icon: Package, description: 'New order awaiting validation' },
  [OrderStatus.SHARIAH_VALIDATED]: { label: 'Validated', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: FileCheck, description: 'Order passed Shariah compliance' },
  [OrderStatus.AI_EVALUATED]: { label: 'AI Checked', color: 'text-purple-600', bg: 'bg-purple-50', icon: Brain, description: 'AI risk assessment completed' },
  [OrderStatus.PENDING_BANK_APPROVAL]: { label: 'Awaiting Bank', color: 'text-amber-600', bg: 'bg-amber-50', icon: Building2, description: 'Waiting for bank approval' },
  [OrderStatus.BANK_APPROVED]: { label: 'Bank Approved', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, description: 'Bank approved financing' },
  [OrderStatus.FUNDED]: { label: 'Ready to Process', color: 'text-green-600', bg: 'bg-green-50', icon: CreditCard, description: 'Escrow funded - ready for you to accept' },
  [OrderStatus.PROCESSING]: { label: 'Processing', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: RefreshCw, description: 'You are preparing this order' },
  [OrderStatus.IN_TRANSIT]: { label: 'Shipped', color: 'text-orange-600', bg: 'bg-orange-50', icon: Truck, description: 'Order is on the way to buyer' },
  [OrderStatus.DELIVERED]: { label: 'Delivered', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, description: 'Buyer confirmed delivery' },
  [OrderStatus.DELIVERY_VERIFIED]: { label: 'Verified', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Shield, description: 'Delivery verified by system' },
  [OrderStatus.SETTLED]: { label: 'Payment Received', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: DollarSign, description: 'Payment released to you' },
  [OrderStatus.COMPLETED]: { label: 'Completed', color: 'text-gray-600', bg: 'bg-gray-50', icon: CheckCircle, description: 'Transaction complete' },
  [OrderStatus.CANCELLED]: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, description: 'Order has been cancelled' },
  [OrderStatus.REFUNDED]: { label: 'Refunded', color: 'text-amber-600', bg: 'bg-amber-50', icon: RefreshCw, description: 'Funds refunded to buyer' },
  [OrderStatus.DISPUTED]: { label: 'Disputed', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle, description: 'Order is under dispute' },
  [OrderStatus.BLOCKED]: { label: 'Blocked', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, description: 'Order blocked' },
  [OrderStatus.FROZEN]: { label: 'Frozen', color: 'text-blue-600', bg: 'bg-blue-50', icon: AlertCircle, description: 'Order frozen pending resolution' },
};

export default function SellerOrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
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

  // Get delivery info if order has delivery
  const { data: delivery } = useQuery(
    ['order-delivery', order?.delivery_id],
    () => apiClient.getDeliveryById(order!.delivery_id!),
    { enabled: !!order?.delivery_id }
  );

  // Get verification status
  const { data: verificationStatus, refetch: refetchVerification } = useQuery(
    ['verification-status', order?.delivery_id],
    () => apiClient.getVerificationStatus(order!.delivery_id!),
    { enabled: !!order?.delivery_id }
  );

  const processOrderMutation = useMutation(
    (data: SellerProcessRequest) => apiClient.sellerProcessOrder(id as string, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['order', id]);
        queryClient.invalidateQueries(['seller-orders']);
        setShowAcceptModal(false);
        setShowRejectModal(false);
        setShowShipModal(false);
      },
    }
  );

  // Seller request pickup confirmation mutation
  const requestPickupConfirmationMutation = useMutation(
    () => apiClient.sellerRequestPickupConfirmation(order!.delivery_id!),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['verification-status', order?.delivery_id]);
        refetchVerification();
      },
    }
  );

  const handleAcceptOrder = () => {
    processOrderMutation.mutate({
      action: 'accept',
      estimated_delivery_date: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : undefined,
    });
  };

  const handleRejectOrder = () => {
    processOrderMutation.mutate({
      action: 'reject',
      notes: rejectReason,
    });
  };

  const handleShipOrder = () => {
    processOrderMutation.mutate({
      action: 'ship',
      tracking_number: trackingNumber || undefined,
      estimated_delivery_date: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : undefined,
    });
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-50', icon: Package, description: '' };
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
          <p className="text-gray-600 mb-6">The order you're looking for doesn't exist or you don't have access.</p>
          <Link href="/seller/orders" className="text-emerald-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const config = getStatusConfig(order.status);
  const StatusIcon = config.icon;
  const canAccept = order.status === OrderStatus.FUNDED;
  const canShip = order.status === OrderStatus.PROCESSING;
  const canReject = order.status === OrderStatus.FUNDED || order.status === OrderStatus.PROCESSING;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="seller-order-detail-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-200" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#seller-order-detail-pattern)" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/seller/orders"
            className="p-2 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order {order.order_number}</h1>
            <p className="text-gray-600">
              Received {new Date(order.created_at).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card with Actions */}
            <div className={`${config.bg} rounded-2xl p-6 border border-gray-200`}>
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl bg-white/50`}>
                  <StatusIcon className={`w-8 h-8 ${config.color}`} />
                </div>
                <div className="flex-1">
                  <h2 className={`text-xl font-bold ${config.color}`}>{config.label}</h2>
                  <p className="text-gray-600">{config.description}</p>
                </div>
              </div>

              {/* Action Buttons */}
              {(canAccept || canShip || canReject) && (
                <div className="mt-6 flex gap-3">
                  {canAccept && (
                    <button
                      onClick={() => setShowAcceptModal(true)}
                      className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Accept Order
                    </button>
                  )}
                  {canShip && (
                    <button
                      onClick={() => setShowShipModal(true)}
                      className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Truck className="w-5 h-5" />
                      Mark as Shipped
                    </button>
                  )}
                  {canReject && (
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-4 py-3 bg-white text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2 border border-red-200"
                    >
                      <Ban className="w-5 h-5" />
                      Reject
                    </button>
                  )}
                </div>
              )}
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
                  <p className="text-gray-600 mb-2">SKU: {order.product?.sku || 'N/A'}</p>
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

            {/* Delivery Address */}
            {order.delivery_address && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  Delivery Address
                </h3>
                <div className="space-y-2 text-gray-600">
                  <p className="font-medium text-gray-900">{order.buyer?.full_name || order.buyer?.business_name}</p>
                  <p>{order.delivery_address.street}</p>
                  <p>{order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.postal_code}</p>
                  <p>{order.delivery_address.country}</p>
                  {order.delivery_address.phone && (
                    <p className="flex items-center gap-2 mt-2">
                      <Phone className="w-4 h-4" />
                      {order.delivery_address.phone}
                    </p>
                  )}
                  {order.delivery_address.instructions && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                      <p className="text-sm font-medium text-amber-800">Delivery Instructions:</p>
                      <p className="text-sm text-amber-700">"{order.delivery_address.instructions}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Delivery Verification Section - Only show when order has delivery */}
            {order.delivery_id && verificationStatus && (
              <div className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border ${verificationStatus?.fraud_detected ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-gray-400" />
                  Delivery Verification
                </h3>
                
                {verificationStatus?.fraud_detected && (
                  <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">Fraud Detected!</p>
                      <p className="text-sm text-red-700">
                        Photo verification failed after maximum attempts. Order has been cancelled.
                      </p>
                    </div>
                  </div>
                )}

                {/* Pickup Verification Status */}
                <div className="p-4 border border-gray-200 rounded-xl mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Pickup Verification</span>
                    </div>
                    {verificationStatus?.pickup.photo_verified ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-sm">
                        <CheckCircle className="w-4 h-4" /> Photo Verified
                      </span>
                    ) : (
                      <span className="text-amber-600 text-sm flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Waiting for provider
                      </span>
                    )}
                  </div>
                  
                  {/* Show request confirmation button when photo is verified but seller hasn't requested yet */}
                  {verificationStatus?.pickup.photo_verified && 
                   !verificationStatus?.pickup.seller_requested_confirmation && 
                   !verificationStatus?.fraud_detected && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-3">
                        The delivery provider has verified the pickup photo. Please request confirmation from the provider.
                      </p>
                      <button
                        onClick={() => requestPickupConfirmationMutation.mutate()}
                        disabled={requestPickupConfirmationMutation.isLoading}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        {requestPickupConfirmationMutation.isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Request Pickup Confirmation
                      </button>
                    </div>
                  )}
                  
                  {/* Show waiting for provider confirmation */}
                  {verificationStatus?.pickup.seller_requested_confirmation && 
                   !verificationStatus?.pickup.provider_confirmed && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                      <p className="text-sm text-amber-700 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Confirmation requested. Waiting for delivery provider to confirm pickup.
                      </p>
                    </div>
                  )}
                  
                  {/* Show completed status */}
                  {verificationStatus?.pickup.provider_confirmed && (
                    <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-emerald-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Pickup confirmed by provider at{' '}
                        {new Date(verificationStatus.pickup.provider_confirmed_at!).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Delivery Verification Status */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-emerald-600" />
                      <span className="font-medium">Delivery Verification</span>
                    </div>
                    {verificationStatus?.delivery.photo_verified ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-sm">
                        <CheckCircle className="w-4 h-4" /> Verified by Buyer
                      </span>
                    ) : verificationStatus?.pickup.provider_confirmed ? (
                      <span className="text-amber-600 text-sm flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Waiting for buyer
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Not yet started</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    {verificationStatus?.pickup.provider_confirmed 
                      ? 'Order is being delivered. Buyer will verify upon receipt.'
                      : 'Complete pickup verification first.'}
                  </p>
                </div>

                {/* Escrow Release Requirements */}
                {verificationStatus?.escrow_release_requirements && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-emerald-600" />
                      <span className="font-medium">Escrow Release Status</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(verificationStatus.escrow_release_requirements).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-1">
                          {value ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-300" />
                          )}
                          <span className={value ? 'text-emerald-700' : 'text-gray-500'}>
                            {key.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                    {verificationStatus.can_release_escrow && (
                      <div className="mt-3 p-2 bg-emerald-100 rounded-lg">
                        <p className="text-sm text-emerald-700 font-medium">
                          ✅ All requirements met. Escrow will be released soon.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
            {/* Order Summary */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">ETB {Number(order.total_amount).toLocaleString()}</span>
                </div>
                {order.financing_requested && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      Financed
                    </span>
                    <span className="font-medium text-purple-600">ETB {Number(order.bank_financing_amount).toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">You will receive</span>
                    <span className="text-xl font-bold text-emerald-600">ETB {Number(order.total_amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buyer Info */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Buyer</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{order.buyer?.business_name || order.buyer?.full_name}</p>
                    <p className="text-sm text-gray-600">{order.buyer?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date</span>
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
                {order.actual_delivery_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivered</span>
                    <span className="font-medium text-emerald-600">
                      {new Date(order.actual_delivery_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {order.settled_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Released</span>
                    <span className="font-medium text-emerald-600">
                      {new Date(order.settled_at).toLocaleDateString()}
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

      {/* Accept Order Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Accept Order</h3>
            <p className="text-gray-600 mb-6">
              By accepting this order, you commit to preparing and shipping the goods to the buyer.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Delivery Date (optional)
              </label>
              <input
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptOrder}
                disabled={processOrderMutation.isLoading}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processOrderMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                Accept Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ship Order Modal */}
      {showShipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Ship Order</h3>
            <p className="text-gray-600 mb-6">
              Mark this order as shipped. The buyer will be notified.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking Number (optional)
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Delivery Date (optional)
                </label>
                <input
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowShipModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShipOrder}
                disabled={processOrderMutation.isLoading}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processOrderMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                Mark as Shipped
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Order Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Order</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to reject this order? The buyer will be refunded.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="E.g., Out of stock, unable to fulfill..."
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
                onClick={handleRejectOrder}
                disabled={processOrderMutation.isLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processOrderMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Ban className="w-5 h-5" />
                )}
                Reject Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

