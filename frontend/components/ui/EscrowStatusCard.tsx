/**
 * EscrowStatusCard - Display escrow state and financial information
 */
import { Escrow, EscrowState } from '@/types';
import { Card, CardHeader } from './Card';
import { StatusBadge } from './StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Lock, Unlock, ArrowLeft, AlertTriangle, Clock, Wallet } from 'lucide-react';
import { Button } from './Button';
import Link from 'next/link';

interface EscrowStatusCardProps {
  escrow?: Escrow | null;
  orderId: string;
  orderAmount?: number;
  showFundingAction?: boolean;
  className?: string;
}

const getEscrowStateConfig = (state?: EscrowState) => {
  switch (state) {
    case EscrowState.PENDING:
      return { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
    case EscrowState.LOCKED:
      return { label: 'Locked', color: 'text-blue-700', bgColor: 'bg-blue-100' };
    case EscrowState.RELEASED:
      return { label: 'Released', color: 'text-green-700', bgColor: 'bg-green-100' };
    case EscrowState.REVERTED:
      return { label: 'Reverted', color: 'text-red-700', bgColor: 'bg-red-100' };
    case EscrowState.FROZEN:
      return { label: 'Frozen', color: 'text-purple-700', bgColor: 'bg-purple-100' };
    case EscrowState.PARTIALLY_RELEASED:
      return { label: 'Partially Released', color: 'text-orange-700', bgColor: 'bg-orange-100' };
    default:
      return { label: 'Not Created', color: 'text-gray-700', bgColor: 'bg-gray-100' };
  }
};

export function EscrowStatusCard({ escrow, orderId, orderAmount, showFundingAction = false, className }: EscrowStatusCardProps) {
  const config = getEscrowStateConfig(escrow?.status);
  const needsFunding = !escrow || escrow.status === EscrowState.PENDING;

  const getIcon = () => {
    if (!escrow) return <Clock className="w-5 h-5 text-gray-400" />;
    switch (escrow.status) {
      case EscrowState.PENDING:
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case EscrowState.LOCKED:
        return <Lock className="w-5 h-5 text-blue-500" />;
      case EscrowState.RELEASED:
        return <Unlock className="w-5 h-5 text-green-500" />;
      case EscrowState.REVERTED:
        return <ArrowLeft className="w-5 h-5 text-red-500" />;
      case EscrowState.FROZEN:
        return <AlertTriangle className="w-5 h-5 text-purple-500" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader
        title="Escrow Status"
        subtitle="Fund security and state information"
      />
      
      <div className="space-y-4">
        {/* State Badge */}
        <div className="flex items-center gap-2">
          {getIcon()}
          <StatusBadge
            label={config.label}
            color={config.color}
            bgColor={config.bgColor}
          />
        </div>

        {/* Amount */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">
            {escrow ? 'Escrow Amount' : 'Order Amount'}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(escrow?.total_amount || orderAmount || 0)}
          </div>
          {escrow && escrow.available_balance !== escrow.total_amount && (
            <div className="mt-2 text-sm text-gray-500">
              Available: {formatCurrency(escrow.available_balance)}
            </div>
          )}
        </div>

        {/* Escrow Details */}
        {escrow && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Escrow Number:</span>
              <span className="text-gray-900 font-mono">{escrow.escrow_number}</span>
            </div>
            {escrow.locked_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Locked At:</span>
                <span className="text-gray-900">{formatDate(escrow.locked_at)}</span>
              </div>
            )}
            {escrow.released_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Released At:</span>
                <span className="text-gray-900">{formatDate(escrow.released_at)}</span>
              </div>
            )}
            {escrow.reverted_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Reverted At:</span>
                <span className="text-gray-900">{formatDate(escrow.reverted_at)}</span>
              </div>
            )}
            {escrow.frozen_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Frozen At:</span>
                <span className="text-gray-900">{formatDate(escrow.frozen_at)}</span>
              </div>
            )}
          </div>
        )}

        {/* Funding Action */}
        {showFundingAction && needsFunding && (
          <div className="pt-4 border-t">
            <Link href={`/buyer/orders/${orderId}/fund`}>
              <Button className="w-full" variant="primary">
                <Wallet className="w-4 h-4 mr-2" />
                Fund Escrow
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}



