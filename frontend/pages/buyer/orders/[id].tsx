/**
 * Buyer Order Detail Page
 * View order details, confirm delivery, and verify delivery photos
 */
import { useState, useEffect, useRef } from 'react';
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
  Star,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { Order, OrderStatus, OrderStatusHistory } from '@/types';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType; description: string }> = {
  [OrderStatus.CREATED]: { label: 'Order Created', color: 'text-blue-600', bg: 'bg-blue-50', icon: Package, description: 'Your order has been placed and is being validated' },
  [OrderStatus.SHARIAH_VALIDATED]: { label: 'Shariah Validated', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: FileCheck, description: 'Order passed Shariah compliance check' },
  [OrderStatus.AI_EVALUATED]: { label: 'AI Evaluated', color: 'text-purple-600', bg: 'bg-purple-50', icon: Brain, description: 'AI risk assessment completed' },
  [OrderStatus.PENDING_BANK_APPROVAL]: { label: 'Awaiting Bank Approval', color: 'text-amber-600', bg: 'bg-amber-50', icon: Building2, description: 'Waiting for bank to approve financing' },
  [OrderStatus.BANK_APPROVED]: { label: 'Bank Approved', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, description: 'Financing approved by bank' },
  [OrderStatus.FUNDED]: { label: 'Escrow Funded', color: 'text-blue-600', bg: 'bg-blue-50', icon: CreditCard, description: 'Funds secured in escrow' },
  [OrderStatus.PROCESSING]: { label: 'Processing', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: RefreshCw, description: 'Seller is preparing your order' },
  [OrderStatus.IN_TRANSIT]: { label: 'In Transit', color: 'text-orange-600', bg: 'bg-orange-50', icon: Truck, description: 'Your order is on the way' },
  [OrderStatus.DELIVERED]: { label: 'Delivered', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, description: 'Order has been delivered' },
  [OrderStatus.DELIVERY_VERIFIED]: { label: 'Verified', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Shield, description: 'Delivery verified by system' },
  [OrderStatus.SETTLED]: { label: 'Settled', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, description: 'Payment released to seller' },
  [OrderStatus.COMPLETED]: { label: 'Completed', color: 'text-gray-600', bg: 'bg-gray-50', icon: CheckCircle, description: 'Transaction complete' },
  [OrderStatus.CANCELLED]: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, description: 'Order has been cancelled' },
  [OrderStatus.REFUNDED]: { label: 'Refunded', color: 'text-amber-600', bg: 'bg-amber-50', icon: RefreshCw, description: 'Funds have been refunded' },
  [OrderStatus.DISPUTED]: { label: 'Disputed', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle, description: 'Order is under dispute' },
  [OrderStatus.BLOCKED]: { label: 'Blocked', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, description: 'Order blocked due to compliance issues' },
  [OrderStatus.FROZEN]: { label: 'Frozen', color: 'text-blue-600', bg: 'bg-blue-50', icon: AlertCircle, description: 'Order frozen pending resolution' },
};

export default function BuyerOrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [rating, setRating] = useState(5);
  const [disputeReason, setDisputeReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  
  // Photo verification state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    is_match: boolean;
    similarity_score: number;
    message: string;
    next_step?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle authentication and authorization
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    const userRole = user.role || (user as any).roles?.[0];
    if (userRole && userRole !== 'buyer') {
      const dashboardRoutes: Record<string, string> = {
        seller: '/seller',
        bank: '/bank',
        delivery_provider: '/delivery',
        admin: '/admin',
      };
      router.push(dashboardRoutes[userRole] || '/');
    }
  }, [user, authLoading, router]);

  const { data: order, isLoading, error, refetch: refetchOrder } = useQuery<Order>(
    ['order', id],
    () => apiClient.getOrder(id as string),
    { enabled: !!id && !!user && !authLoading }
  );

  const { data: history } = useQuery<OrderStatusHistory[]>(
    ['order-history', id],
    () => apiClient.getOrderHistory(id as string),
    { enabled: !!id && !!user && !authLoading && showHistory }
  );

  // Get delivery info for this order (to get delivery_id)
  const { data: deliveries } = useQuery(
    ['order-deliveries', id],
    async () => {
      // First get deliveries and find one matching this order
      const response = await apiClient.getAssignedDeliveries();
      return response.deliveries.filter((d: any) => d.order_id === id);
    },
    { enabled: !!id && !!order }
  );

  const deliveryId = order?.delivery_id || deliveries?.[0]?.id;

  // Get verification status
  const { data: verificationStatus, refetch: refetchVerification } = useQuery(
    ['verification-status', deliveryId],
    () => apiClient.getVerificationStatus(deliveryId),
    { enabled: !!deliveryId }
  );

  // Photo verification mutation (Buyer verifies delivery)
  const verifyPhotoMutation = useMutation(
    (data: { photo_base64: string; photo_type: 'delivery'; notes?: string }) =>
      apiClient.verifyDeliveryPhoto(deliveryId, data),
    {
      onSuccess: (result) => {
        setVerificationResult(result);
        queryClient.invalidateQueries(['order', id]);
        queryClient.invalidateQueries(['verification-status', deliveryId]);
        refetchVerification();
        refetchOrder();
      },
    }
  );

  const confirmDeliveryMutation = useMutation(
    (data: { confirmed: boolean; notes?: string; rating?: number }) =>
      apiClient.confirmDelivery(id as string, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['order', id]);
        queryClient.invalidateQueries(['buyer-orders']);
        setShowConfirmModal(false);
        setShowDisputeModal(false);
      },
    }
  );

  const cancelOrderMutation = useMutation(
    (reason: string) => apiClient.cancelOrder(id as string, { reason }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['order', id]);
        queryClient.invalidateQueries(['buyer-orders']);
        setShowCancelModal(false);
      },
    }
  );

  // Photo handling functions
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        const base64Data = base64.split(',')[1];
        setSelectedPhoto(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoVerification = () => {
    if (!selectedPhoto) return;
    verifyPhotoMutation.mutate({
      photo_base64: selectedPhoto,
      photo_type: 'delivery',
    });
  };

  const openPhotoModal = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setVerificationResult(null);
    setShowPhotoModal(true);
  };

  const handleConfirmDelivery = () => {
    confirmDeliveryMutation.mutate({
      confirmed: true,
      notes: confirmNotes,
      rating,
    });
  };

  const handleReportIssue = () => {
    confirmDeliveryMutation.mutate({
      confirmed: false,
      notes: disputeReason,
    });
  };

  const handleCancelOrder = () => {
    cancelOrderMutation.mutate(cancelReason);
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-50', icon: Package, description: '' };
  };

  // Show loading state while checking auth or loading order
  if (authLoading || !user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Check role before rendering
  const userRole = user.role || (user as any).roles?.[0];
  if (userRole !== 'buyer') {
    return null;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">The order you're looking for doesn't exist or you don't have access.</p>
          <Link href="/buyer/orders" className="text-emerald-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const config = getStatusConfig(order.status);
  const StatusIcon = config.icon;
  // Buyer can confirm delivery when order is delivered or in transit
  const canConfirmDelivery = order.status === OrderStatus.DELIVERED || order.status === OrderStatus.IN_TRANSIT;
  const canCancel = order.can_be_cancelled && order.status !== OrderStatus.CANCELLED;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="order-detail-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-200" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#order-detail-pattern)" />
        </svg>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/buyer/orders"
            className="p-2 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order {order.order_number}</h1>
            <p className="text-gray-600">
              Placed on {new Date(order.created_at).toLocaleDateString('en-US', { 
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
            {/* Status Card */}
            <div className={`${config.bg} rounded-2xl p-6 border border-gray-200`}>
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl bg-white/50`}>
                  <StatusIcon className={`w-8 h-8 ${config.color}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${config.color}`}>{config.label}</h2>
                  <p className="text-gray-600">{config.description}</p>
                </div>
              </div>

              {/* Action Buttons */}
              {canConfirmDelivery && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                    disabled={!verificationStatus?.delivery?.photo_verified}
                  >
                    <CheckCircle className="w-5 h-5" />
                    Confirm Delivery
                  </button>
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="px-4 py-3 bg-white text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2 border border-red-200"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    Report Issue
                  </button>
                </div>
              )}
            </div>

            {/* Photo Verification Card (Buyer takes delivery photo) */}
            {deliveryId && (order.status === OrderStatus.IN_TRANSIT || order.status === OrderStatus.DELIVERED) && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-600" />
                  Delivery Photo Verification
                </h3>
                
                {verificationStatus?.fraud_detected && (
                  <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">Fraud Detected!</p>
                      <p className="text-sm text-red-700">
                        Product photo does not match the listing. Do not accept this delivery.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Pickup Status (from seller) */}
                  <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Pickup from Seller</span>
                      </div>
                      {verificationStatus?.pickup?.photo_verified ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm">
                          <CheckCircle className="w-4 h-4" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-600 text-sm">Pending</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {verificationStatus?.pickup?.provider_confirmed 
                        ? '✅ Pickup confirmed by provider'
                        : verificationStatus?.pickup?.seller_requested_confirmation
                        ? '⏳ Waiting for provider confirmation'
                        : verificationStatus?.pickup?.photo_verified
                        ? '⏳ Waiting for seller to request confirmation'
                        : '⏳ Delivery provider will verify pickup'}
                    </p>
                  </div>

                  {/* Delivery Verification (Buyer takes photo) */}
                  <div className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-emerald-600" />
                        <span className="font-medium">Verify Your Delivery</span>
                      </div>
                      {verificationStatus?.delivery?.photo_verified ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm">
                          <CheckCircle className="w-4 h-4" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-600 text-sm">Action Required</span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      When you receive the product, take a photo to verify it matches what you ordered.
                      The AI will compare it with the product listing image.
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {verificationStatus?.pickup?.provider_confirmed && 
                       !verificationStatus?.delivery?.photo_verified && 
                       !verificationStatus?.fraud_detected && (
                        <button
                          onClick={openPhotoModal}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Take Delivery Photo
                          {verificationStatus?.delivery?.attempts_used > 0 && (
                            <span className="text-xs ml-1">
                              ({verificationStatus.delivery.attempts_remaining} attempts left)
                            </span>
                          )}
                        </button>
                      )}
                      {!verificationStatus?.pickup?.provider_confirmed && (
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Waiting for pickup verification
                        </span>
                      )}
                      {verificationStatus?.delivery?.photo_verified && (
                        <span className="text-sm text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Photo verified! You can now confirm delivery.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Escrow Status */}
                  {verificationStatus && (
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-5 h-5 text-emerald-600" />
                        <span className="font-medium">Verification Progress</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          {verificationStatus.pickup?.photo_verified ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-300" />
                          )}
                          <span className={verificationStatus.pickup?.photo_verified ? 'text-emerald-700' : 'text-gray-500'}>
                            Pickup verified
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {verificationStatus.pickup?.provider_confirmed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-300" />
                          )}
                          <span className={verificationStatus.pickup?.provider_confirmed ? 'text-emerald-700' : 'text-gray-500'}>
                            Provider confirmed
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {verificationStatus.delivery?.photo_verified ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-300" />
                          )}
                          <span className={verificationStatus.delivery?.photo_verified ? 'text-emerald-700' : 'text-gray-500'}>
                            Delivery verified
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {!verificationStatus.fraud_detected ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={!verificationStatus.fraud_detected ? 'text-emerald-700' : 'text-red-600'}>
                            No fraud detected
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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

            {/* Order Timeline / History */}
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

            {/* Delivery Address */}
            {order.delivery_address && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  Delivery Address
                </h3>
                <div className="space-y-2 text-gray-600">
                  <p>{order.delivery_address.street}</p>
                  <p>{order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.postal_code}</p>
                  <p>{order.delivery_address.country}</p>
                  {order.delivery_address.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {order.delivery_address.phone}
                    </p>
                  )}
                  {order.delivery_address.instructions && (
                    <p className="text-sm italic mt-2">"{order.delivery_address.instructions}"</p>
                  )}
                </div>
              </div>
            )}
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
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Down Payment (20%)</span>
                      <span className="font-medium text-gray-900">ETB {Number(order.buyer_down_payment).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bank Financing (80%)</span>
                      <span className="font-medium text-gray-900">ETB {Number(order.bank_financing_amount).toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-emerald-600">ETB {Number(order.total_amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller</h3>
              <div className="space-y-3">
                <p className="font-medium text-gray-900">{order.seller?.business_name || order.seller?.full_name}</p>
                {order.seller?.email && (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    {order.seller.email}
                  </p>
                )}
              </div>
            </div>

            {/* Compliance Status */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Shariah
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.shariah_status === 'compliant' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : order.shariah_status === 'pending'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {order.shariah_status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Review
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.ai_approval_status === 'approved' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : order.ai_approval_status === 'pending'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {order.ai_approval_status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                {order.financing_requested && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Bank
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.bank_approval_status === 'approved' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : order.bank_approval_status === 'pending'
                        ? 'bg-amber-50 text-amber-600'
                        : order.bank_approval_status === 'rejected'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-gray-50 text-gray-600'
                    }`}>
                      {order.bank_approval_status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Cancel Order */}
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full px-4 py-3 bg-white text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors border border-red-200"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delivery Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Delivery</h3>
            <p className="text-gray-600 mb-6">
              Please confirm that you have received your order in good condition. 
              This will release the payment to the seller.
            </p>

            {/* Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rate your experience</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`p-1 ${star <= rating ? 'text-amber-400' : 'text-gray-300'}`}
                  >
                    <Star className="w-8 h-8 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
              <textarea
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                rows={3}
                placeholder="Any feedback about your order..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelivery}
                disabled={confirmDeliveryMutation.isLoading}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {confirmDeliveryMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Report Delivery Issue</h3>
            <p className="text-gray-600 mb-6">
              Please describe the issue with your delivery. This will initiate a dispute resolution process.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Describe the issue *</label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                rows={4}
                placeholder="E.g., Product not received, wrong item, damaged goods..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDisputeModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReportIssue}
                disabled={confirmDeliveryMutation.isLoading || !disputeReason.trim()}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {confirmDeliveryMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                Report Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Order</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cancellation reason *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                rows={3}
                placeholder="Please provide a reason for cancellation..."
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelOrderMutation.isLoading || cancelReason.length < 10}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelOrderMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Verification Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📦 Verify Your Delivery
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Take a clear photo of the product you received. The AI will compare it with the listing image to verify authenticity.
            </p>
            
            <div className="space-y-4">
              {/* Photo Preview / Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  photoPreview ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <div className="space-y-3">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="max-h-48 mx-auto rounded-lg shadow"
                    />
                    <p className="text-sm text-emerald-600">Click to change photo</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="text-gray-600">Click to take or upload photo</p>
                    <p className="text-xs text-gray-400">JPG, PNG up to 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              {/* Verification Result */}
              {verificationResult && (
                <div className={`p-4 rounded-xl ${
                  verificationResult.is_match 
                    ? 'bg-emerald-100 border border-emerald-300' 
                    : 'bg-red-100 border border-red-300'
                }`}>
                  <div className="flex items-start gap-3">
                    {verificationResult.is_match ? (
                      <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`font-semibold ${
                        verificationResult.is_match ? 'text-emerald-800' : 'text-red-800'
                      }`}>
                        {verificationResult.is_match ? 'Photo Verified!' : 'Verification Failed!'}
                      </p>
                      <p className={`text-sm ${
                        verificationResult.is_match ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        {verificationResult.message}
                      </p>
                      {verificationResult.next_step && (
                        <p className="text-sm mt-1 text-gray-600">
                          Next: {verificationResult.next_step}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPhotoModal(false);
                    setVerificationResult(null);
                    setSelectedPhoto(null);
                    setPhotoPreview(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  {verificationResult?.is_match ? 'Close' : 'Cancel'}
                </button>
                {!verificationResult && (
                  <button
                    onClick={handlePhotoVerification}
                    disabled={!selectedPhoto || verifyPhotoMutation.isLoading}
                    className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {verifyPhotoMutation.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Verify Photo
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
