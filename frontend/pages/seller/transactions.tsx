/**
 * Seller Transaction History Page
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
  Search,
  Download,
  Filter,
  Calendar,
  Receipt
} from 'lucide-react';
import { useState } from 'react';

type TransactionType = 'all' | 'credit' | 'debit';
type TransactionStatus = 'all' | 'completed' | 'pending' | 'failed';

const typeFilters = [
  { value: 'all', label: 'All' },
  { value: 'credit', label: 'Credits' },
  { value: 'debit', label: 'Debits' },
];

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

export default function SellerTransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: transactions, isLoading } = useQuery('seller-transactions', () => 
    apiClient.getSellerTransactions()
  );

  const filteredTransactions = transactions?.filter((t: any) => {
    if (typeFilter !== 'all' && t.type?.toLowerCase() !== typeFilter) return false;
    if (statusFilter !== 'all' && t.status?.toLowerCase() !== statusFilter) return false;
    if (searchTerm && !t.reference?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    totalCredits: transactions?.filter((t: any) => t.type === 'CREDIT').reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0,
    totalDebits: transactions?.filter((t: any) => t.type === 'DEBIT').reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0,
    transactionCount: transactions?.length || 0,
    thisMonth: transactions?.filter((t: any) => {
      const date = new Date(t.created_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length || 0,
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'FAILED') return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' };
    if (status === 'PENDING') return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' };
    if (type === 'CREDIT') return { icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-100' };
    return { icon: ArrowUpRight, color: 'text-blue-500', bg: 'bg-blue-100' };
  };

  return (
    <DashboardLayout role="SELLER">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-gray-500 mt-1">View all your financial transactions</p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Statement
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Total Credits</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalCredits)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Debits</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalDebits)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-xl font-bold text-gray-900">{stats.transactionCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-xl font-bold text-gray-900">{stats.thisMonth}</p>
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
                placeholder="Search by reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {typeFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTypeFilter(filter.value as TransactionType)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    typeFilter === filter.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TransactionStatus)}
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            >
              {statusFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader 
            title="All Transactions"
            subtitle={`${filteredTransactions?.length || 0} transactions`}
          />
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredTransactions?.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTransactions?.map((transaction: any) => {
                const iconConfig = getTransactionIcon(transaction.type, transaction.status);
                const Icon = iconConfig.icon;
                const isCredit = transaction.type === 'CREDIT';
                
                return (
                  <div 
                    key={transaction.id}
                    className="py-4 flex items-center justify-between hover:bg-gray-50/50 -mx-6 px-6 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl ${iconConfig.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${iconConfig.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.description || `${isCredit ? 'Payment received' : 'Fee deducted'}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.reference} • {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-semibold ${isCredit ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      <span className={`text-xs ${
                        transaction.status === 'COMPLETED' ? 'text-emerald-500' :
                        transaction.status === 'PENDING' ? 'text-amber-500' :
                        'text-red-500'
                      }`}>
                        {transaction.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                        {transaction.status === 'PENDING' && <Clock className="w-3 h-3 inline mr-1" />}
                        {transaction.status}
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
