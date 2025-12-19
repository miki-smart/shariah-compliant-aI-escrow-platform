/**
 * EscrowStatusCard - Display escrow state and financial information
 */
import { Escrow } from '@/types';
import { Card, CardHeader } from './Card';
import { StatusBadge } from './StatusBadge';
import { getEscrowStateConfig } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Lock, Unlock, ArrowLeft, AlertTriangle } from 'lucide-react';

interface EscrowStatusCardProps {
  escrow: Escrow;
  className?: string;
}

export function EscrowStatusCard({ escrow, className }: EscrowStatusCardProps) {
  const config = getEscrowStateConfig(escrow.state);

  const getIcon = () => {
    switch (escrow.state) {
      case 'LOCKED':
        return <Lock className="w-5 h-5" />;
      case 'RELEASED':
        return <Unlock className="w-5 h-5" />;
      case 'REVERTED':
        return <ArrowLeft className="w-5 h-5" />;
      case 'FROZEN':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return null;
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
          <div className="text-sm text-gray-500 mb-1">Escrow Amount</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(escrow.amount)}
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-2 text-sm">
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
        </div>
      </div>
    </Card>
  );
}


