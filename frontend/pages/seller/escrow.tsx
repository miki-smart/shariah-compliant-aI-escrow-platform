/**
 * Seller Escrow Page - View escrow accounts and releases
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Lock, 
  Unlock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Search,
  Eye,
  ArrowUpRight,
  Wallet
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

type EscrowFilter = 'all' | 'locked' | 'pending_release' | 'released';

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'locked', label: 'Locked' },
  { value: 'pending_release', label: 'Pending Release' },
  { value: 'released', label: 'Released' },
];

const getEscrowConfig = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'FUNDED':
    case 'LOCKED':
      return { 
        label: 'Locked', 
        icon: Lock,
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-200'
      };
    case 'PENDING_RELEASE':
      return { 
        label: 'Pending Release', 
        icon: Clock,
        color: 'text-amber-600', 
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-200'
      };
    case 'RELEASED':
      return { 
        label: 'Released', 
        icon: ArrowUpRight,
        color: 'text-emerald-600', 
        bgColor: 'bg-emerald-100',
        borderColor: 'border-emerald-200'
      };
    case 'DISPUTED':
      return { 
        label: 'Disputed', 
        icon: AlertTriangle,
        color: 'text-red-600', 
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200'
      };
    default:
      return { 
        label: 'Pending', 
        icon: Clock,
        color: 'text-gray-600', 
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-200'
      };
  }
};

export default function SellerEscrowPage() {
  const [filter, setFilter] = useState<EscrowFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: escrows, isLoading } = useQuery('seller-escrows', () => 
    apiClient.getSellerEscrows()
  );

  const filteredEscrows = escrows?.filter((e: any) => {
    if (filter !== 'all' && e.status?.toLowerCase() !== filter) return false;
    if (searchTerm && !e.escrow_number?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    totalLocked: escrows?.filter((e: any) => ['FUNDED', 'LOCKED'].includes(e.status)).reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0,
    pendingRelease: escrows?.filter((e: any) => e.status === 'PENDING_RELEASE').reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0,
    totalReleased: escrows?.filter((e: any) => e.status === 'RELEASED').reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0,
    escrowCount: escrows?.length || 0,
  };

  return (
    <DashboardLayout role="SELLER">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Escrow Accounts</h1>
            <p className="text-gray-500 mt-1">Monitor your funds held in escrow</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-500 border-0 text-white">
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

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Release</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.pendingRelease)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Released</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalReleased)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Escrow Accounts</p>
                <p className="text-xl font-bold text-gray-900">{stats.escrowCount}</p>
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
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value as EscrowFilter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === opt.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Escrow List */}
        <Card>
          <CardHeader 
            title="Your Escrow Accounts"
            subtitle={`${filteredEscrows?.length || 0} accounts`}
          />
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredEscrows?.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No escrow accounts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEscrows?.map((escrow: any) => {
                const config = getEscrowConfig(escrow.status);
                const StatusIcon = config.icon;
                
                return (
                  <div 
                    key={escrow.id}
                    className={`p-4 rounded-xl border-2 ${config.borderColor} bg-white hover:shadow-md transition-all`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                          <StatusIcon className={`w-7 h-7 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Escrow #{escrow.escrow_number || escrow.id?.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Order: {escrow.order_id?.slice(0, 8)} • Buyer: {escrow.buyer_name || 'N/A'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {escrow.shariah_compliant && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
                                <Shield className="w-3 h-3" />
                                Shariah Compliant
                              </span>
                            )}
                            {escrow.status === 'PENDING_RELEASE' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                                <Clock className="w-3 h-3" />
                                Awaiting Bank Approval
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(escrow.amount)}
                          </p>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {config.label}
                          </span>
                        </div>
                        
                        <Link href={`/seller/orders/${escrow.order_id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View Order
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    {/* Release Timeline */}
                    {escrow.status === 'PENDING_RELEASE' && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-700 mb-2">Release Progress:</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                              style={{ width: '75%' }}
                            />
                          </div>
                          <span className="text-sm text-gray-500">Pending bank approval</span>
                        </div>
                      </div>
                    )}
                    
                    {escrow.status === 'RELEASED' && escrow.released_at && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-emerald-600">
                          <CheckCircle2 className="w-4 h-4 inline mr-1" />
                          Released on {formatDate(escrow.released_at)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* How It Works */}
        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <h3 className="font-semibold text-gray-900 mb-4">How Escrow Release Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <p className="font-medium text-gray-900">Buyer Pays</p>
                <p className="text-sm text-gray-500">Funds are securely held in escrow</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <p className="font-medium text-gray-900">Delivery</p>
                <p className="text-sm text-gray-500">You ship the order to buyer</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <p className="font-medium text-gray-900">Confirmation</p>
                <p className="text-sm text-gray-500">Buyer confirms receipt</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div>
                <p className="font-medium text-gray-900">Release</p>
                <p className="text-sm text-gray-500">Funds released to you</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
