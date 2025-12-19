/**
 * Buyer Orders Page
 * List and manage orders as a buyer
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
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
  Truck,
  Building2,
  FileCheck,
  Loader2,
  ChevronRight,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { Order, OrderStatus, OrderListResponse } from '@/types';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  [OrderStatus.CREATED]: { label: 'Order Created', color: 'text-blue-600', bg: 'bg-blue-50', icon: Package },
  [OrderStatus.SHARIAH_VALIDATED]: { label: 'Shariah Validated', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: FileCheck },
  [OrderStatus.AI_EVALUATED]: { label: 'AI Evaluated', color: 'text-purple-600', bg: 'bg-purple-50', icon: CheckCircle },
  [OrderStatus.PENDING_BANK_APPROVAL]: { label: 'Awaiting Bank', color: 'text-amber-600', bg: 'bg-amber-50', icon: Building2 },
  [OrderStatus.BANK_APPROVED]: { label: 'Bank Approved', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  [OrderStatus.FUNDED]: { label: 'Escrow Funded', color: 'text-blue-600', bg: 'bg-blue-50', icon: CreditCard },
  [OrderStatus.PROCESSING]: { label: 'Processing', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: RefreshCw },
  [OrderStatus.IN_TRANSIT]: { label: 'In Transit', color: 'text-orange-600', bg: 'bg-orange-50', icon: Truck },
  [OrderStatus.DELIVERED]: { label: 'Delivered', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  [OrderStatus.DELIVERY_VERIFIED]: { label: 'Verified', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  [OrderStatus.SETTLED]: { label: 'Settled', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  [OrderStatus.COMPLETED]: { label: 'Completed', color: 'text-gray-600', bg: 'bg-gray-50', icon: CheckCircle },
  [OrderStatus.CANCELLED]: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  [OrderStatus.REFUNDED]: { label: 'Refunded', color: 'text-amber-600', bg: 'bg-amber-50', icon: RefreshCw },
  [OrderStatus.DISPUTED]: { label: 'Disputed', color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
  [OrderStatus.BLOCKED]: { label: 'Blocked', color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  [OrderStatus.FROZEN]: { label: 'Frozen', color: 'text-blue-600', bg: 'bg-blue-50', icon: AlertCircle },
};

export default function BuyerOrdersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: ordersData, isLoading, error, refetch } = useQuery<OrderListResponse>(
    ['buyer-orders', statusFilter],
    () => apiClient.getMyOrders({ role_filter: 'buyer', status: statusFilter || undefined, limit: 100 }),
    { enabled: !!user && !authLoading }
  );

  const orders = ordersData?.orders || [];

  // Filter orders by search
  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(search) ||
      order.product?.name?.toLowerCase().includes(search) ||
      order.seller?.business_name?.toLowerCase().includes(search)
    );
  });

  // Stats
  const activeOrders = orders.filter((o) => o.is_active).length;
  const pendingDelivery = orders.filter((o) => o.status === OrderStatus.IN_TRANSIT).length;
  const completedOrders = orders.filter((o) => o.status === OrderStatus.COMPLETED || o.status === OrderStatus.SETTLED).length;
  const totalSpent = orders
    .filter((o) => o.status === OrderStatus.SETTLED || o.status === OrderStatus.COMPLETED)
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || { label: status, color: 'text-gray-600', bg: 'bg-gray-50', icon: Package };
  };

  // Handle authentication and authorization (client-side only)
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    // Check if user has buyer role
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
  if (userRole !== 'buyer') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="orders-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-200" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#orders-pattern)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/buyer"
              className="p-2 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-600 mt-1">Track and manage your orders</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold text-gray-900">{activeOrders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100">
                <Truck className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Transit</p>
                <p className="text-2xl font-bold text-gray-900">{pendingDelivery}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{completedOrders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">ETB {totalSpent.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number, product, or seller..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-12 pr-10 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 appearance-none cursor-pointer min-w-[200px]"
              >
                <option value="">All Statuses</option>
                <option value={OrderStatus.CREATED}>Created</option>
                <option value={OrderStatus.PENDING_BANK_APPROVAL}>Pending Bank</option>
                <option value={OrderStatus.FUNDED}>Funded</option>
                <option value={OrderStatus.PROCESSING}>Processing</option>
                <option value={OrderStatus.IN_TRANSIT}>In Transit</option>
                <option value={OrderStatus.DELIVERED}>Delivered</option>
                <option value={OrderStatus.SETTLED}>Settled</option>
                <option value={OrderStatus.COMPLETED}>Completed</option>
                <option value={OrderStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error loading orders</h3>
            <p className="text-red-600">Please try again later</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-6">Start shopping to place your first order</p>
            <Link
              href="/buyer/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              Browse Products
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const config = getStatusConfig(order.status);
              const StatusIcon = config.icon;

              return (
                <Link
                  key={order.id}
                  href={`/buyer/orders/${order.id}`}
                  className="block bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-emerald-200 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
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

                      {/* Order Info */}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-sm text-gray-500">{order.order_number}</span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {config.label}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {order.product?.name || 'Unknown Product'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Seller: {order.seller?.business_name || order.seller?.full_name || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {/* Amount & Action */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        ETB {Number(order.total_amount).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500 mb-2">
                        Qty: {Number(order.quantity)} × ETB {Number(order.unit_price).toLocaleString()}
                      </p>
                      {order.financing_requested && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs font-medium">
                          <Building2 className="w-3 h-3" />
                          Murabaha Financing
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order Timeline Summary */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                      {order.expected_delivery_date && (
                        <span className="flex items-center gap-1">
                          <Truck className="w-4 h-4" />
                          Est. {new Date(order.expected_delivery_date).toLocaleDateString()}
                        </span>
                      )}
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
    </div>
  );
}

