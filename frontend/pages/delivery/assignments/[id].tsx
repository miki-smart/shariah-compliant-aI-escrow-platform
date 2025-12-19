/**
 * Delivery Detail Page - View and manage a specific delivery
 * Includes photo verification workflow for fraud prevention
 */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { 
  Truck, Package, MapPin, Clock, CheckCircle, AlertCircle, ArrowLeft,
  Phone, User, Navigation, Camera, FileText, RefreshCw, XCircle, Shield,
  Upload, Eye, AlertTriangle, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';

const deliveryStatusFlow = [
  { status: 'pending', label: 'Pending', next: 'assigned' },
  { status: 'assigned', label: 'Assigned', next: 'picked_up' },
  { status: 'picked_up', label: 'Picked Up', next: 'in_transit' },
  { status: 'in_transit', label: 'In Transit', next: 'out_for_delivery' },
  { status: 'out_for_delivery', label: 'Out for Delivery', next: 'delivered' },
  { status: 'delivered', label: 'Delivered', next: null },
  { status: 'confirmed', label: 'Confirmed', next: null },
  { status: 'failed', label: 'Failed', next: null },
];

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'picked_up': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'in_transit': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'out_for_delivery': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
    case 'confirmed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'failed': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getNextAction = (status: string): { label: string; status: string; variant: 'primary' | 'gradient' | 'danger' } | null => {
  switch (status) {
    case 'pending': return { label: 'Accept Delivery', status: 'assigned', variant: 'primary' };
    case 'assigned': return { label: 'Start Pickup', status: 'picked_up', variant: 'primary' };
    case 'picked_up': return { label: 'Start Transit', status: 'in_transit', variant: 'primary' };
    case 'in_transit': return { label: 'Out for Delivery', status: 'out_for_delivery', variant: 'primary' };
    case 'out_for_delivery': return { label: 'Mark Delivered', status: 'delivered', variant: 'gradient' };
    case 'delivered': return { label: 'Confirm Completion', status: 'confirmed', variant: 'gradient' };
    default: return null;
  }
};

export default function DeliveryDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoType, setPhotoType] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [location, setLocation] = useState({
    address: '',
    city: '',
    notes: '',
  });

  // Fetch delivery details
  const { data: delivery, isLoading, refetch } = useQuery(
    ['delivery', id],
    () => apiClient.getDeliveryById(id as string),
    { enabled: !!id && !!user && !authLoading }
  );

  // Fetch verification status
  const { data: verificationStatus, refetch: refetchVerification } = useQuery(
    ['verification-status', id],
    () => apiClient.getVerificationStatus(id as string),
    { enabled: !!id && !!user && !authLoading }
  );

  // Fetch tracking events
  const { data: trackingEvents } = useQuery(
    ['delivery-tracking', id],
    () => apiClient.getDeliveryTracking(id as string),
    { enabled: !!id && !!user && !authLoading }
  );

  // Update status mutation
  const updateStatusMutation = useMutation(
    (data: { status: string; notes?: string; location?: any; failure_reason?: string }) =>
      apiClient.updateDeliveryStatusNew(id as string, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['delivery', id]);
        queryClient.invalidateQueries(['delivery-tracking', id]);
        queryClient.invalidateQueries('assigned-deliveries');
        queryClient.invalidateQueries('delivery-stats');
        setNotes('');
        setShowLocationModal(false);
        setShowFailureModal(false);
      },
    }
  );

  // Photo verification mutation (Provider only does pickup photos)
  const verifyPhotoMutation = useMutation(
    (data: { photo_base64: string; photo_type: 'pickup'; notes?: string }) =>
      apiClient.verifyPickupPhoto(id as string, data),
    {
      onSuccess: (result) => {
        setVerificationResult(result);
        queryClient.invalidateQueries(['delivery', id]);
        queryClient.invalidateQueries(['verification-status', id]);
        refetchVerification();
      },
    }
  );

  // Complete delivery mutation
  const completeDeliveryMutation = useMutation(
    () => apiClient.completeDeliveryWithVerification(id as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['delivery', id]);
        queryClient.invalidateQueries(['verification-status', id]);
        queryClient.invalidateQueries('assigned-deliveries');
      },
    }
  );

  // Provider confirms pickup mutation (after seller requests confirmation)
  const providerConfirmPickupMutation = useMutation(
    () => apiClient.providerConfirmPickup(id as string),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['delivery', id]);
        queryClient.invalidateQueries(['verification-status', id]);
        queryClient.invalidateQueries('assigned-deliveries');
      },
    }
  );

  // Confirm delivery mutation
  const confirmMutation = useMutation(
    () => apiClient.confirmDeliveryByProvider(id as string, notes),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['delivery', id]);
        queryClient.invalidateQueries('assigned-deliveries');
      },
    }
  );

  // Handle photo selection
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        // Extract just the base64 data (remove data:image/...;base64, prefix)
        const base64Data = base64.split(',')[1];
        setSelectedPhoto(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit photo for verification
  const handlePhotoVerification = () => {
    if (!selectedPhoto) return;
    
    verifyPhotoMutation.mutate({
      photo_base64: selectedPhoto,
      photo_type: photoType,
      notes: notes,
    });
  };

  // Open photo modal
  const openPhotoModal = (type: 'pickup' | 'delivery') => {
    setPhotoType(type);
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setVerificationResult(null);
    setShowPhotoModal(true);
  };

  // Handle auth
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    const userRole = user.role || (user as any).roles?.[0];
    if (userRole && userRole !== 'delivery_provider' && userRole !== 'admin') {
      router.push('/');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <DashboardLayout role="DELIVERY">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Delivery not found</h2>
          <Link href="/delivery/assignments">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const nextAction = getNextAction(delivery.status);
  const currentStepIndex = deliveryStatusFlow.findIndex(s => s.status === delivery.status);

  const handleStatusUpdate = (newStatus: string) => {
    updateStatusMutation.mutate({
      status: newStatus,
      notes,
      location: location.address ? location : undefined,
    });
  };

  const handleFailDelivery = () => {
    updateStatusMutation.mutate({
      status: 'failed',
      failure_reason: failureReason,
      notes,
    });
  };

  return (
    <DashboardLayout role="DELIVERY">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/delivery/assignments">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Delivery {delivery.tracking_number || `#${delivery.id.slice(0, 8)}`}
              </h1>
              <p className="text-gray-500">Order: {delivery.order_number || delivery.order_id?.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-4 py-2 rounded-xl text-sm font-semibold border ${getStatusColor(delivery.status)}`}>
              {delivery.status.replace(/_/g, ' ').toUpperCase()}
            </span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Progress */}
            <Card>
              <CardHeader title="Delivery Progress" subtitle="Track the delivery status" />
              <div className="relative">
                <div className="flex justify-between items-center">
                  {deliveryStatusFlow.slice(0, 6).map((step, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isCurrent = step.status === delivery.status;
                    const isFailed = delivery.status === 'failed';
                    
                    return (
                      <div key={step.status} className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : isCurrent
                              ? isFailed
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-blue-500 border-blue-500 text-white'
                              : 'bg-gray-100 border-gray-200 text-gray-400'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : isFailed && isCurrent ? (
                            <XCircle className="w-5 h-5" />
                          ) : (
                            <span className="text-sm font-medium">{index + 1}</span>
                          )}
                        </div>
                        <span className={`mt-2 text-xs text-center ${isCurrent ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Progress Line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.max(0, (currentStepIndex / 5) * 100)}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Photo Verification Card */}
            <Card className={verificationStatus?.fraud_detected ? 'border-red-300 bg-red-50' : ''}>
              <CardHeader 
                title="📸 Photo Verification" 
                subtitle="AI-powered product verification for fraud prevention" 
              />
              
              {verificationStatus?.fraud_detected && (
                <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800">Fraud Detected!</p>
                    <p className="text-sm text-red-700">
                      {verificationStatus.fraud_type === 'pickup_photo_mismatch' 
                        ? 'Product photo at pickup does not match the listing. Process blocked.'
                        : 'Product photo at delivery does not match. Process blocked.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Pickup Verification */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Pickup Verification</span>
                    </div>
                    {verificationStatus?.pickup.photo_verified ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-sm">
                        <CheckCircle className="w-4 h-4" /> Verified
                      </span>
                    ) : verificationStatus?.pickup.photo_uploaded ? (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" /> Failed
                      </span>
                    ) : (
                      <span className="text-amber-600 text-sm">Pending</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    Take a photo of the product when picking up from seller. AI will verify it matches the listing.
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {!verificationStatus?.pickup.photo_verified && !verificationStatus?.fraud_detected && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openPhotoModal('pickup')}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Take Pickup Photo
                        {verificationStatus?.pickup.attempts_used > 0 && (
                          <span className="ml-1 text-xs">
                            ({verificationStatus.pickup.attempts_remaining} attempts left)
                          </span>
                        )}
                      </Button>
                    )}
                    {verificationStatus?.pickup.photo_verified && 
                     !verificationStatus?.pickup.seller_requested_confirmation && (
                      <span className="text-sm text-amber-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> Waiting for seller to request confirmation
                      </span>
                    )}
                    {verificationStatus?.pickup.seller_requested_confirmation && 
                     !verificationStatus?.pickup.provider_confirmed && (
                      <Button
                        variant="gradient"
                        size="sm"
                        onClick={() => providerConfirmPickupMutation.mutate()}
                        disabled={providerConfirmPickupMutation.isLoading}
                      >
                        {providerConfirmPickupMutation.isLoading ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Confirm Pickup
                      </Button>
                    )}
                    {verificationStatus?.pickup.provider_confirmed && (
                      <span className="text-sm text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Pickup confirmed
                      </span>
                    )}
                  </div>
                </div>

                {/* Delivery Verification (Done by Buyer) */}
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
                    ) : verificationStatus?.delivery.photo_uploaded ? (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" /> Failed
                      </span>
                    ) : (
                      <span className="text-amber-600 text-sm">Pending</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    The buyer will take a photo when receiving the product to verify it matches the listing.
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {verificationStatus?.pickup.provider_confirmed && 
                     !verificationStatus?.delivery.photo_verified && 
                     !verificationStatus?.fraud_detected && (
                      <span className="text-sm text-amber-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Waiting for buyer to verify delivery
                      </span>
                    )}
                    {!verificationStatus?.pickup.provider_confirmed && !verificationStatus?.pickup.photo_verified && (
                      <span className="text-sm text-gray-500">
                        Complete pickup verification first
                      </span>
                    )}
                  </div>
                </div>

                {/* Escrow Release Status */}
                {verificationStatus && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-emerald-600" />
                      <span className="font-medium">Escrow Release Status</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(verificationStatus.escrow_release_requirements || {}).map(([key, value]) => (
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
                      <div className="mt-3">
                        <Button
                          variant="gradient"
                          onClick={() => completeDeliveryMutation.mutate()}
                          disabled={completeDeliveryMutation.isLoading}
                        >
                          {completeDeliveryMutation.isLoading ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Complete & Release Escrow
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader title="Actions" subtitle="Update delivery status" />
              <div className="space-y-4">
                {/* Notes Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Add notes about this status update..."
                  />
                </div>

                {/* Location Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Address
                    </label>
                    <input
                      type="text"
                      value={location.address}
                      onChange={(e) => setLocation({ ...location, address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Current location..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={location.city}
                      onChange={(e) => setLocation({ ...location, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="City..."
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                  {nextAction && (
                    <Button
                      variant={nextAction.variant}
                      onClick={() => handleStatusUpdate(nextAction.status)}
                      disabled={updateStatusMutation.isLoading}
                    >
                      {updateStatusMutation.isLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {nextAction.label}
                    </Button>
                  )}
                  
                  {delivery.status === 'delivered' && (
                    <Button
                      variant="gradient"
                      onClick={() => confirmMutation.mutate()}
                      disabled={confirmMutation.isLoading}
                    >
                      {confirmMutation.isLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Confirm Delivery
                    </Button>
                  )}

                  {!['delivered', 'confirmed', 'failed'].includes(delivery.status) && (
                    <Button
                      variant="danger"
                      onClick={() => setShowFailureModal(true)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Mark Failed
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Tracking Events */}
            <Card>
              <CardHeader title="Tracking History" subtitle="Delivery event timeline" />
              {trackingEvents && trackingEvents.length > 0 ? (
                <div className="space-y-4">
                  {trackingEvents.map((event, index) => (
                    <div key={event.id || index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        {index < trackingEvents.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-gray-900">
                          {event.event_type.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600">{event.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                        {event.location && (
                          <p className="text-xs text-gray-500 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {typeof event.location === 'object'
                              ? (event.location as any).address || (event.location as any).city
                              : event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No tracking events yet</p>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Delivery Info */}
            <Card>
              <CardHeader title="Delivery Information" />
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Tracking Number</p>
                  <p className="font-semibold text-gray-900">{delivery.tracking_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Order ID</p>
                  <p className="font-mono text-sm text-gray-900">{delivery.order_id}</p>
                </div>
                {delivery.estimated_delivery && (
                  <div>
                    <p className="text-sm text-gray-500">Estimated Delivery</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(delivery.estimated_delivery).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {delivery.actual_delivery && (
                  <div>
                    <p className="text-sm text-gray-500">Actual Delivery</p>
                    <p className="font-semibold text-emerald-600">
                      {new Date(delivery.actual_delivery).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Pickup Address */}
            {delivery.pickup_address && (
              <Card>
                <CardHeader title="Pickup Address" />
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    {typeof delivery.pickup_address === 'object' ? (
                      <>
                        <p className="font-medium text-gray-900">
                          {(delivery.pickup_address as any).address}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(delivery.pickup_address as any).city}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-900">{delivery.pickup_address}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Delivery Address */}
            {delivery.delivery_address && (
              <Card>
                <CardHeader title="Delivery Address" />
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    {typeof delivery.delivery_address === 'object' ? (
                      <>
                        <p className="font-medium text-gray-900">
                          {(delivery.delivery_address as any).address}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(delivery.delivery_address as any).city}
                        </p>
                        {(delivery.delivery_address as any).phone && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {(delivery.delivery_address as any).phone}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-900">{delivery.delivery_address}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Special Instructions */}
            {delivery.special_instructions && (
              <Card>
                <CardHeader title="Special Instructions" />
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-gray-700">{delivery.special_instructions}</p>
                </div>
              </Card>
            )}

            {/* Buyer/Seller Info */}
            <Card>
              <CardHeader title="Parties" />
              <div className="space-y-4">
                {delivery.buyer_name && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Buyer</p>
                      <p className="font-medium text-gray-900">{delivery.buyer_name}</p>
                    </div>
                  </div>
                )}
                {delivery.seller_name && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Seller</p>
                      <p className="font-medium text-gray-900">{delivery.seller_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Failure Modal */}
      {showFailureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mark Delivery as Failed</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Failure Reason *
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Select a reason...</option>
                  <option value="customer_unavailable">Customer Unavailable</option>
                  <option value="wrong_address">Wrong Address</option>
                  <option value="refused_delivery">Delivery Refused</option>
                  <option value="damaged_package">Package Damaged</option>
                  <option value="access_issue">Access Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Describe what happened..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowFailureModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleFailDelivery}
                  disabled={!failureReason || updateStatusMutation.isLoading}
                >
                  {updateStatusMutation.isLoading ? 'Saving...' : 'Mark as Failed'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Verification Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {photoType === 'pickup' ? '📦 Pickup Photo Verification' : '🚚 Delivery Photo Verification'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {photoType === 'pickup' 
                ? 'Take a clear photo of the product you are picking up from the seller.'
                : 'Take a clear photo of the product before handing it to the buyer.'}
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
                      <p className="text-xs mt-2 text-gray-500">
                        Similarity Score: {verificationResult.similarity_score}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Add any notes about this verification..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPhotoModal(false);
                    setVerificationResult(null);
                    setSelectedPhoto(null);
                    setPhotoPreview(null);
                  }}
                >
                  {verificationResult?.is_match ? 'Close' : 'Cancel'}
                </Button>
                {!verificationResult && (
                  <Button
                    variant="gradient"
                    className="flex-1"
                    onClick={handlePhotoVerification}
                    disabled={!selectedPhoto || verifyPhotoMutation.isLoading}
                  >
                    {verifyPhotoMutation.isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Verify Photo
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
