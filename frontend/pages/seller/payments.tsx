/**
 * Seller Payments Page - View incoming payments and earnings
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Wallet,
  CreditCard,
  Search,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

type PaymentStatus = 'all' | 'pending' | 'processing' | 'completed';

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
];

const getStatusConfig = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
    case 'RELEASED':
      return { 
        label: 'Completed', 
        color: 'text-emerald-600', 
        bgColor: 'bg-emerald-100' 
      };
    case 'PROCESSING':
      return { 
        label: 'Processing', 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100' 
      };
    case 'PENDING':
    default:
      return { 
        label: 'Pending', 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-100' 
      };
  }
};

export default function SellerPaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: payments, isLoading } = useQuery('seller-payments', () => 
    apiClient.getSellerPayments()
  );

  const filteredPayments = payments?.filter((p: any) => {
    if (statusFilter !== 'all' && p.status?.toLowerCase() !== statusFilter) return false;
    if (searchTerm && !p.order_id?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    totalEarnings: payments?.reduce((sum: number, p: any) => p.status === 'COMPLETED' ? sum + (p.amount || 0) : sum, 0) || 0,
    pendingAmount: payments?.reduce((sum: number, p: any) => p.status === 'PENDING' ? sum + (p.amount || 0) : sum, 0) || 0,
    thisMonth: payments?.filter((p: any) => {
      const paymentDate = new Date(p.completed_at);
      const now = new Date();
      return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
    }).reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0,
    completedCount: payments?.filter((p: any) => p.status === 'COMPLETED').length || 0,
  };

  return (
    <DashboardLayout role="SELLER">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-500 mt-1">Track your earnings and incoming payments</p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-500 to-indigo-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Earnings</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalEarnings)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.pendingAmount)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.thisMonth)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-xl font-bold text-gray-900">{stats.completedCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as PaymentStatus)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Payments List */}
        <Card>
          <CardHeader 
            title="Payment History"
            subtitle={`${filteredPayments?.length || 0} payments`}
          />
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredPayments?.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No payments found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayments?.map((payment: any) => {
                const config = getStatusConfig(payment.status);
                
                return (
                  <div 
                    key={payment.id}
                    className="p-4 rounded-xl border-2 border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${
                          payment.status === 'COMPLETED' ? 'bg-emerald-100' : 'bg-amber-100'
                        } flex items-center justify-center`}>
                          {payment.status === 'COMPLETED' ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          ) : (
                            <Clock className="w-6 h-6 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Order #{payment.order_id?.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payment.status === 'COMPLETED' 
                              ? `Completed ${formatDate(payment.completed_at)}`
                              : `Expected ${formatDate(payment.expected_date)}`
                            }
                          </p>
                          {payment.buyer_name && (
                            <p className="text-sm text-gray-400">From: {payment.buyer_name}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">
                            {formatCurrency(payment.amount)}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        
                        <Link href={`/seller/orders/${payment.order_id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Payment Methods */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Payment Method</h3>
              <p className="text-sm text-gray-600 mt-1">
                Funds are released to your registered bank account after buyer confirmation and Shariah compliance validation.
              </p>
              <div className="mt-3 p-3 bg-white rounded-lg border border-purple-100">
                <p className="text-sm font-medium text-gray-900">Islamic Bank Account</p>
                <p className="text-sm text-gray-500">****1234 • Auto-release enabled</p>
              </div>
            </div>
            <Button variant="outline">
              Manage
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
