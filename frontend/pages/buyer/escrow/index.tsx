/**
 * Buyer Escrow Status Page - View all escrow accounts and their status
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
  AlertTriangle,
  ArrowRight,
  Shield,
  CheckCircle2,
  XCircle,
  Wallet
} from 'lucide-react';
import Link from 'next/link';
import { EscrowState } from '@/types';

const getStatusConfig = (status: EscrowState) => {
  switch (status) {
    case EscrowState.PENDING:
      return { 
        label: 'Awaiting Funding', 
        icon: Clock, 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200'
      };
    case EscrowState.LOCKED:
      return { 
        label: 'Funds Locked', 
        icon: Lock, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    case EscrowState.RELEASED:
      return { 
        label: 'Released to Seller', 
        icon: Unlock, 
        color: 'text-emerald-600', 
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200'
      };
    case EscrowState.REVERTED:
      return { 
        label: 'Refunded', 
        icon: ArrowRight, 
        color: 'text-purple-600', 
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200'
      };
    case EscrowState.FROZEN:
      return { 
        label: 'Frozen - Under Review', 
        icon: AlertTriangle, 
        color: 'text-red-600', 
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    default:
      return { 
        label: 'Unknown', 
        icon: Clock, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      };
  }
};

export default function BuyerEscrowPage() {
  const { data: escrows, isLoading } = useQuery('buyer-escrows', () => 
    apiClient.getBuyerEscrows()
  );

  // Stats calculation
  const stats = {
    totalLocked: escrows?.filter((e: any) => e.status === EscrowState.LOCKED).reduce((sum: number, e: any) => sum + (Number(e.total_amount) || 0), 0) || 0,
    pendingFunding: escrows?.filter((e: any) => e.status === EscrowState.PENDING).length || 0,
    releasedTotal: escrows?.filter((e: any) => e.status === EscrowState.RELEASED).reduce((sum: number, e: any) => sum + (Number(e.total_amount) || 0), 0) || 0,
  };

  return (
    <DashboardLayout role="BUYER">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escrow Status</h1>
          <p className="text-gray-500 mt-1">Monitor your escrow accounts and fund security</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Funds in Escrow</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalLocked)}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Lock className="w-7 h-7" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Pending Funding</p>
                <p className="text-3xl font-bold mt-1">{stats.pendingFunding} Orders</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Clock className="w-7 h-7" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Total Released</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(stats.releasedTotal)}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            </div>
          </Card>
        </div>

        {/* Escrow List */}
        <Card>
          <CardHeader 
            title="Your Escrow Accounts"
            subtitle="All orders with escrow protection"
          />
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : escrows?.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No escrow accounts found</p>
              <Link href="/buyer/products">
                <Button variant="primary" className="mt-4">
                  Browse Products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {escrows?.map((escrow: any) => {
                const config = getStatusConfig(escrow.status);
                const StatusIcon = config.icon;
                
                return (
                  <div 
                    key={escrow.id}
                    className={`p-4 rounded-xl border-2 ${config.borderColor} ${config.bgColor} transition-all hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${config.bgColor} border ${config.borderColor} flex items-center justify-center`}>
                          <StatusIcon className={`w-6 h-6 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Order #{escrow.order_id?.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Escrow: {escrow.escrow_number}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(escrow.total_amount)}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Created: {formatDate(escrow.created_at)}</span>
                        {escrow.status === EscrowState.LOCKED && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <Shield className="w-4 h-4" />
                            Shariah Compliant
                          </span>
                        )}
                      </div>
                      
                      <Link href={`/buyer/orders/${escrow.order_id}`}>
                        <Button variant="ghost" size="sm">
                          View Order
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Shariah-Compliant Escrow Protection</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your funds are held securely in our Shariah-compliant escrow system. 
                Payments are only released to sellers after you confirm delivery and all 
                compliance checks pass. This ensures fair and ethical transactions.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
