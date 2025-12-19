/**
 * Buyer Transactions Page - View all payment transactions
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2,
  XCircle,
  Filter,
  Download,
  Search,
  History
} from 'lucide-react';
import { useState } from 'react';

type TransactionType = 'all' | 'funding' | 'release' | 'refund';

const transactionTypeConfig = {
  FUNDING: { 
    label: 'Escrow Funding', 
    icon: ArrowUpRight, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50' 
  },
  RELEASE: { 
    label: 'Payment Released', 
    icon: ArrowDownLeft, 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50' 
  },
  REFUND: { 
    label: 'Refund Received', 
    icon: ArrowDownLeft, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50' 
  },
  PARTIAL_RELEASE: { 
    label: 'Partial Release', 
    icon: ArrowDownLeft, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50' 
  },
};

const statusConfig = {
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600' },
  PENDING: { label: 'Pending', icon: Clock, color: 'text-amber-600' },
  FAILED: { label: 'Failed', icon: XCircle, color: 'text-red-600' },
};

export default function BuyerTransactionsPage() {
  const [filter, setFilter] = useState<TransactionType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: transactions, isLoading } = useQuery('buyer-transactions', () => 
    apiClient.getBuyerTransactions()
  );

  const filteredTransactions = transactions?.filter((tx: any) => {
    if (filter !== 'all' && tx.transaction_type.toLowerCase() !== filter) return false;
    if (searchTerm && !tx.reference_number.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Calculate totals
  const totals = {
    funded: transactions?.filter((t: any) => t.transaction_type === 'FUNDING' && t.status === 'COMPLETED')
      .reduce((sum: number, t: any) => sum + t.amount, 0) || 0,
    released: transactions?.filter((t: any) => t.transaction_type === 'RELEASE' && t.status === 'COMPLETED')
      .reduce((sum: number, t: any) => sum + t.amount, 0) || 0,
    refunded: transactions?.filter((t: any) => t.transaction_type === 'REFUND' && t.status === 'COMPLETED')
      .reduce((sum: number, t: any) => sum + t.amount, 0) || 0,
  };

  return (
    <DashboardLayout role="BUYER">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-500 mt-1">View your payment history and transaction details</p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export History
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Funded</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.funded)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Released to Sellers</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.released)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Refunds Received</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totals.refunded)}</p>
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
                placeholder="Search by reference number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'funding', 'release', 'refund'] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === type
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader 
            title="Transaction History"
            subtitle={`${filteredTransactions?.length || 0} transactions`}
          />
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredTransactions?.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTransactions?.map((tx: any) => {
                const typeConfig = transactionTypeConfig[tx.transaction_type as keyof typeof transactionTypeConfig] || transactionTypeConfig.FUNDING;
                const status = statusConfig[tx.status as keyof typeof statusConfig] || statusConfig.PENDING;
                const TypeIcon = typeConfig.icon;
                const StatusIcon = status.icon;
                
                return (
                  <div 
                    key={tx.id}
                    className="py-4 flex items-center justify-between hover:bg-gray-50 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${typeConfig.bgColor} flex items-center justify-center`}>
                        <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{typeConfig.label}</p>
                        <p className="text-sm text-gray-500">
                          {tx.reference_number} • {formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        tx.transaction_type === 'FUNDING' ? 'text-gray-900' : 'text-emerald-600'
                      }`}>
                        {tx.transaction_type === 'FUNDING' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-xs ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
