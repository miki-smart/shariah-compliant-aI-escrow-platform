/**
 * Bank Orders Page
 * Review and approve financing requests
 */
import { useState, useEffect } from 'react';
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
  Search,
  Filter,
  Loader2,
  ChevronRight,
  Building2,
  FileCheck,
  Shield,
  Brain,
  DollarSign,
  Users,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { Order, OrderStatus, OrderListResponse, BankApprovalRequest } from '@/types';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  [OrderStatus.PENDING_BANK_APPROVAL]: { label: 'Pending Review', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
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

export default function BankOrdersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showApproveModal, setShowApproveModal] = useState<Order | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  // Get pending approvals - only fetch when authenticated
  const { data: pendingData, isLoading: pendingLoading } = useQuery<OrderListResponse>(
    ['pending-approval-orders'],
    () => apiClient.getPendingApprovalOrders({ limit: 100 }),
    { enabled: !!user && !authLoading }
  );

  // Get all bank orders - only fetch when authenticated
  const { data: ordersData, isLoading: ordersLoading, refetch } = useQuery<OrderListResponse>(
    ['bank-orders', statusFilter],
    () => apiClient.getOrders({ status: statusFilter || undefined, financing_requested: true, limit: 100 }),
    { enabled: !!user && !authLoading }
  );

  const pendingOrders = pendingData?.orders || [];
  const allOrders = ordersData?.orders || [];

  const approveMutation = useMutation(
    (orderId: string) => apiClient.bankApproveOrder(orderId, { approved: true, notes: approveNotes }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pending-approval-orders']);
        queryClient.invalidateQueries(['bank-orders']);
        setShowApproveModal(null);
        setApproveNotes('');
      },
    }
  );

  const rejectMutation = useMutation(
    ({ orderId, reason }: { orderId: string; reason: string }) =>
      apiClient.bankRejectOrder(orderId, { approved: false, reason }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pending-approval-orders']);
        queryClient.invalidateQueries(['bank-orders']);
        setShowRejectModal(null);
        setRejectReason('');
      },
    }
  );

  // Filter orders by search
  const filteredOrders = allOrders.filter((order) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(search) ||
      order.product?.name?.toLowerCase().includes(search) ||
      order.buyer?.business_name?.toLowerCase().includes(search)
    );
  });

  // Stats
  const pendingCount = pendingOrders.length;
  const approvedCount = allOrders.filter((o) => o.bank_approval_status === 'approved').length;
  const totalFinanced = allOrders
    .filter((o) => o.bank_approval_status === 'approved')
    .reduce((sum, o) => sum + Number(o.bank_financing_amount), 0);

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-50', icon: Package };
  };

  const handleApprove = (order: Order) => {
    setShowApproveModal(order);
  };

  const handleReject = (order: Order) => {
    setShowRejectModal(order);
  };

  const confirmApprove = () => {
    if (showApproveModal) {
      approveMutation.mutate(showApproveModal.id);
    }
  };

  const confirmReject = () => {
    if (showRejectModal && rejectReason) {
      rejectMutation.mutate({ orderId: showRejectModal.id, reason: rejectReason });
    }
  };

  // Handle authentication and authorization (client-side only)
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Check if user has bank role
    const userRole = user.role || (user as any).roles?.[0];
    if (userRole && userRole !== 'bank') {
      // Redirect to appropriate dashboard
      const dashboardRoutes: Record<string, string> = {
        buyer: '/buyer',
        seller: '/seller',
        delivery_provider: '/delivery',
        admin: '/admin',
      };
      router.push(dashboardRoutes[userRole] || '/');
    }
  }, [user, authLoading, router]);

  // Show loading state while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  
  // Check role before rendering
  const userRole = user.role || (user as any).roles?.[0];
  if (userRole !== 'bank') {
    return null; // Will redirect via useEffect
  }

  const isLoading = pendingLoading || ordersLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="bank-orders-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-200" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bank-orders-pattern)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/bank"
              className="p-2 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financing Requests</h1>
              <p className="text-gray-600 mt-1">Review and approve Murabaha financing</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Financed</p>
                <p className="text-2xl font-bold text-gray-900">ETB {totalFinanced.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals Section */}
        {pendingOrders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Pending Approval ({pendingOrders.length})
            </h2>
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-amber-200 ring-2 ring-amber-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                        {order.product?.thumbnail_url ? (
                          <img
                            src={order.product.thumbnail_url}
                            alt={order.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-gray-500">{order.order_number}</span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                            Pending Review
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900">{order.product?.name}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {order.buyer?.business_name || order.buyer?.full_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-4 h-4 text-emerald-500" />
                            Shariah: {order.shariah_status}
                          </span>
                          <span className="flex items-center gap-1">
                            <Brain className="w-4 h-4 text-purple-500" />
                            AI: {order.ai_approval_status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ETB {Number(order.bank_financing_amount).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">Financing requested</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleReject(order)}
                          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center gap-1 text-sm"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(order)}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center gap-1 text-sm"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number, product, or buyer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-12 pr-10 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 appearance-none cursor-pointer min-w-[200px]"
              >
                <option value="">All Statuses</option>
                <option value={OrderStatus.PENDING_BANK_APPROVAL}>Pending Approval</option>
                <option value={OrderStatus.FUNDED}>Funded</option>
                <option value={OrderStatus.PROCESSING}>Processing</option>
                <option value={OrderStatus.IN_TRANSIT}>In Transit</option>
                <option value={OrderStatus.DELIVERED}>Delivered</option>
                <option value={OrderStatus.SETTLED}>Settled</option>
                <option value={OrderStatus.COMPLETED}>Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* All Orders List */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">All Financing Orders</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No financing orders</h3>
            <p className="text-gray-600">Orders requesting Murabaha financing will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const config = getStatusConfig(order.status);
              const StatusIcon = config.icon;

              return (
                <Link
                  key={order.id}
                  href={`/bank/orders/${order.id}`}
                  className="block bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-emerald-200 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                        {order.product?.thumbnail_url ? (
                          <img
                            src={order.product.thumbnail_url}
                            alt={order.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-gray-500">{order.order_number}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {config.label}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900">{order.product?.name}</h3>
                        <p className="text-sm text-gray-600">
                          Buyer: {order.buyer?.business_name || order.buyer?.full_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        ETB {Number(order.bank_financing_amount).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        of ETB {Number(order.total_amount).toLocaleString()} total
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      <span className={`flex items-center gap-1 ${
                        order.shariah_status === 'compliant' ? 'text-emerald-600' : 'text-gray-500'
                      }`}>
                        <Shield className="w-4 h-4" />
                        Shariah: {order.shariah_status}
                      </span>
                      <span className={`flex items-center gap-1 ${
                        order.ai_approval_status === 'approved' ? 'text-emerald-600' : 'text-gray-500'
                      }`}>
                        <Brain className="w-4 h-4" />
                        AI: {order.ai_approval_status}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-600 font-medium group-hover:gap-2 transition-all">
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Approve Financing</h3>
            <div className="bg-emerald-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-emerald-800 mb-2">Order: {showApproveModal.order_number}</p>
              <p className="text-2xl font-bold text-emerald-700">
                ETB {Number(showApproveModal.bank_financing_amount).toLocaleString()}
              </p>
              <p className="text-sm text-emerald-600">Murabaha financing</p>
            </div>
            <p className="text-gray-600 mb-4">
              By approving, you authorize the release of financing funds to escrow for this order.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Add any notes for this approval..."
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                disabled={approveMutation.isLoading}
                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {approveMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                Approve Financing
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
            <div className="bg-red-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-800 mb-2">Order: {showRejectModal.order_number}</p>
              <p className="text-lg font-bold text-red-700">
                ETB {Number(showRejectModal.bank_financing_amount).toLocaleString()}
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="E.g., Insufficient credit history, high risk profile..."
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                rows={3}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={rejectMutation.isLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {rejectMutation.isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                Reject Financing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

