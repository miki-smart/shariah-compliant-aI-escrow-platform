/**
 * Bank Escrow Monitor - Monitor all escrow accounts
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Shield, 
  Lock, 
  Unlock,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  TrendingUp,
  DollarSign,
  Users,
  ArrowRight
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { EscrowState } from '@/types';

const statusFilters = [
  { value: 'all', label: 'All Escrows' },
  { value: 'pending', label: 'Pending' },
  { value: 'locked', label: 'Locked' },
  { value: 'released', label: 'Released' },
  { value: 'frozen', label: 'Frozen' },
];

const getStatusConfig = (status: EscrowState) => {
  switch (status) {
    case EscrowState.PENDING:
      return { label: 'Pending', color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200' };
    case EscrowState.LOCKED:
      return { label: 'Locked', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' };
    case EscrowState.RELEASED:
      return { label: 'Released', color: 'text-emerald-600', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-200' };
    case EscrowState.REVERTED:
      return { label: 'Reverted', color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-200' };
    case EscrowState.FROZEN:
      return { label: 'Frozen', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' };
    default:
      return { label: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100', borderColor: 'border-gray-200' };
  }
};

export default function BankEscrowMonitorPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: escrows, isLoading } = useQuery('all-escrows', () => 
    apiClient.getAllEscrows()
  );

  const filteredEscrows = escrows?.filter((e: any) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (searchTerm && !e.escrow_number.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Calculate dashboard stats
  const stats = {
    totalEscrows: escrows?.length || 0,
    totalLocked: escrows?.filter((e: any) => e.status === 'locked').reduce((sum: number, e: any) => sum + e.total_amount, 0) || 0,
    pendingCount: escrows?.filter((e: any) => e.status === 'pending').length || 0,
    frozenCount: escrows?.filter((e: any) => e.status === 'frozen').length || 0,
  };

  return (
    <DashboardLayout role="BANK">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Escrow Monitor</h1>
            <p className="text-gray-500 mt-1">Monitor and manage all escrow accounts</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
            <Button variant="primary">
              <TrendingUp className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Total Escrows</p>
                <p className="text-3xl font-bold mt-1">{stats.totalEscrows}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Funds Locked</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalLocked)}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Pending Funding</p>
                <p className="text-3xl font-bold mt-1">{stats.pendingCount}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-pink-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Frozen Accounts</p>
                <p className="text-3xl font-bold mt-1">{stats.frozenCount}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
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
                placeholder="Search by escrow number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Escrow Table */}
        <Card>
          <CardHeader 
            title="Escrow Accounts"
            subtitle={`${filteredEscrows?.length || 0} accounts`}
          />
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Escrow #</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Order</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Buyer</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Seller</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Shariah</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEscrows?.map((escrow: any) => {
                    const config = getStatusConfig(escrow.status);
                    return (
                      <tr key={escrow.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm text-gray-900">{escrow.escrow_number}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">#{escrow.order_id?.slice(0, 8)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-900">{escrow.buyer?.business_name || 'Buyer'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-900">{escrow.seller?.business_name || 'Seller'}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-gray-900">{formatCurrency(escrow.total_amount)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                            {config.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {escrow.shariah_compliant ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                              <Shield className="w-3.5 h-3.5" />
                              Compliant
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/bank/orders/${escrow.order_id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
