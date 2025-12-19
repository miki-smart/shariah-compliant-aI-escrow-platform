/**
 * ShariahBadge - Special badge for Shariah compliance status
 */
import { StatusBadge } from './StatusBadge';
import { getHalalStatusConfig } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ShariahBadgeProps {
  status?: 'HALAL' | 'HARAM' | 'PENDING';
  className?: string;
}

export function ShariahBadge({ status, className }: ShariahBadgeProps) {
  const config = getHalalStatusConfig(status);
  const Icon =
    status === 'HALAL' ? CheckCircle2 : status === 'HARAM' ? XCircle : Clock;

  return (
    <span className={className}>
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    </span>
  );
}

