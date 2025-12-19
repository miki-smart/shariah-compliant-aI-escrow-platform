/**
 * OrderStatusTimeline - Visual timeline of order status progression
 */
import { OrderStatus } from '@/types';
import { getOrderStatusConfig } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  className?: string;
}

const statusFlow: OrderStatus[] = [
  OrderStatus.CREATED,
  OrderStatus.SHARIAH_APPROVED,
  OrderStatus.AI_APPROVED,
  OrderStatus.BANK_APPROVED,
  OrderStatus.ESCROW_LOCKED,
  OrderStatus.DELIVERED,
  OrderStatus.ESCROW_RELEASED,
];

export function OrderStatusTimeline({ currentStatus, className }: OrderStatusTimelineProps) {
  const currentIndex = statusFlow.indexOf(currentStatus);
  const isRejected = currentStatus.includes('REJECTED') || currentStatus === OrderStatus.CANCELLED;

  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-2', className)}>
      {statusFlow.map((status, index) => {
        const config = getOrderStatusConfig(status);
        const isCompleted = index <= currentIndex && !isRejected;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={status} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                  isCompleted
                    ? 'bg-green-100 border-green-500 text-green-600'
                    : isCurrent
                    ? 'bg-blue-100 border-blue-500 text-blue-600'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isCurrent ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 text-center max-w-[80px]',
                  isCompleted || isCurrent ? 'text-gray-700' : 'text-gray-400'
                )}
              >
                {config.label}
              </span>
            </div>
            {index < statusFlow.length - 1 && (
              <div
                className={cn(
                  'w-12 h-0.5 mx-2',
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                )}
              />
            )}
          </div>
        );
      })}
      {isRejected && (
        <div className="ml-4 flex items-center text-red-600">
          <XCircle className="w-5 h-5 mr-1" />
          <span className="text-sm font-medium">Rejected</span>
        </div>
      )}
    </div>
  );
}


