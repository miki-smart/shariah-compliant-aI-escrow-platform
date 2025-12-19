/**
 * Bank Release Queue Page - Manage fund releases
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  ArrowUpRight, 
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  DollarSign,
  Shield,
  BadgeCheck,
  XCircle,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

type ReleaseStatus = 'all' | 'pending' | 'approved' | 'released' | 'rejected';

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'released', label: 'Released' },
  { value: 'rejected', label: 'Rejected' },
];

const getStatusConfig = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PENDING_RELEASE':
    case 'PENDING':
      return { 
        label: 'Pending Approval', 
        icon: Clock, 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-100' 
      };
    case 'APPROVED':
      return { 
        label: 'Approved', 
        icon: CheckCircle2, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100' 
      };
    case 'RELEASED':
      return { 
        label: 'Released', 
        icon: ArrowUpRight, 
        color: 'text-emerald-600', 
        bgColor: 'bg-emerald-100' 
      };
    case 'REJECTED':
      return { 
        label: 'Rejected', 
        icon: XCircle, 
        color: 'text-red-600', 
        bgColor: 'bg-red-100' 
      };
    default:
      return { 
        label: 'Unknown', 
        icon: AlertTriangle, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-100' 
      };
  }
};

export default function BankReleasesPage() {
  const [statusFilter, setStatusFilter] = useState<ReleaseStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: releaseQueue, isLoading } = useQuery('release-queue', () => 
    apiClient.getEscrowsForRelease()
  );

  const approveReleaseMutation = useMutation(
    (escrowId: string) => apiClient.releaseEscrow(escrowId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('release-queue');
      }
    }
  );

  const filteredQueue = releaseQueue?.filter((r: any) => {
    if (statusFilter !== 'all' && r.release_status?.toLowerCase() !== statusFilter) return false;
    if (searchTerm && !r.escrow_number?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !r.order_id?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total: releaseQueue?.length || 0,
    pending: releaseQueue?.filter((r: any) => ['PENDING_RELEASE', 'PENDING'].includes(r.release_status)).length || 0,
    approved: releaseQueue?.filter((r: any) => r.release_status === 'APPROVED').length || 0,
    totalAmount: releaseQueue?.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0,
  };

  const handleApproveRelease = (escrowId: string) => {
    if (confirm('Are you sure you want to approve this fund release?')) {
      approveReleaseMutation.mutate(escrowId);
    }
  };

  return (
    <DashboardLayout role="BANK">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Release Queue</h1>
            <p className="text-gray-500 mt-1">Review and approve fund releases to sellers</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Pending Releases</p>
                <p className="text-3xl font-bold mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BadgeCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Approved Today</p>
                <p className="text-xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Queue</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
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
                placeholder="Search by escrow # or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as ReleaseStatus)}
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

        {/* Release Queue */}
        <Card>
          <CardHeader 
            title="Fund Release Requests"
            subtitle={`${filteredQueue?.length || 0} requests in queue`}
          />
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredQueue?.length === 0 ? (
            <div className="text-center py-12">
              <ArrowUpRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No release requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQueue?.map((release: any) => {
                const config = getStatusConfig(release.release_status);
                const StatusIcon = config.icon;
                const isPending = ['PENDING_RELEASE', 'PENDING'].includes(release.release_status);
                
                return (
                  <div 
                    key={release.id}
                    className={`p-4 rounded-xl border-2 ${
                      isPending ? 'border-amber-200 bg-amber-50' :
                      release.release_status === 'APPROVED' ? 'border-blue-200 bg-blue-50' :
                      release.release_status === 'RELEASED' ? 'border-emerald-200 bg-emerald-50' :
                      'border-gray-200 bg-gray-50'
                    } transition-all hover:shadow-md`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                          <StatusIcon className={`w-7 h-7 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Escrow #{release.escrow_number || release.id?.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Order: {release.order_id?.slice(0, 8)} • Seller: {release.seller_name || 'N/A'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {release.shariah_compliant && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
                                <Shield className="w-3 h-3" />
                                Shariah Compliant
                              </span>
                            )}
                            {release.delivery_confirmed && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                                <CheckCircle2 className="w-3 h-3" />
                                Delivery Confirmed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(release.amount)}
                          </p>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {config.label}
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {isPending && (
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => handleApproveRelease(release.id)}
                              disabled={approveReleaseMutation.isLoading}
                            >
                              {approveReleaseMutation.isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                          )}
                          <Link href={`/bank/orders/${release.order_id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                    
                    {/* Release Conditions */}
                    <div className="mt-4 pt-4 border-t border-gray-200/50">
                      <p className="text-sm font-medium text-gray-700 mb-2">Release Conditions:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className={`flex items-center gap-2 text-sm ${release.buyer_confirmed ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {release.buyer_confirmed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          Buyer Confirmed
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${release.delivery_confirmed ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {release.delivery_confirmed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          Delivery Confirmed
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${release.shariah_compliant ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {release.shariah_compliant ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          Shariah Validated
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${release.no_disputes ? 'text-emerald-600' : 'text-red-500'}`}>
                          {release.no_disputes ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          No Active Disputes
                        </div>
                      </div>
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
