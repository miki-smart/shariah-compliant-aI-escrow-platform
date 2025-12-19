/**
 * OrderCard - Compact order display card
 */
import { Order } from '@/types';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getOrderStatusConfig } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';

interface OrderCardProps {
  order: Order;
  showActions?: boolean;
  onViewDetails?: () => void;
}

export function OrderCard({ order, showActions = true, onViewDetails }: OrderCardProps) {
  const statusConfig = getOrderStatusConfig(order.status);

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</h3>
            <StatusBadge
              label={statusConfig.label}
              color={statusConfig.color}
              bgColor={statusConfig.bgColor}
            />
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <div>Amount: <span className="font-medium text-gray-900">{formatCurrency(order.total_amount)}</span></div>
            <div>Quantity: <span className="font-medium text-gray-900">{order.quantity}</span></div>
            <div>Created: <span className="font-medium text-gray-900">{formatDate(order.created_at)}</span></div>
            {order.financing_requested === 'true' && (
              <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium mt-2">
                Financing Requested
              </div>
            )}
          </div>
        </div>
        {showActions && (
          <div className="ml-4">
            <Link href={`/orders/${order.id}`}>
              <Button variant="outline" size="sm">
                View Details
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}


