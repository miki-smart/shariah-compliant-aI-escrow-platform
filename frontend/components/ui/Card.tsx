/**
 * Card - Reusable card container component
 * Updated to match emerald/teal auth design
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'bordered';
}

export function Card({ children, className, padding = 'md', variant = 'default' }: CardProps) {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variants = {
    default: 'bg-white border border-gray-200/60 shadow-sm shadow-gray-100',
    gradient: 'bg-gradient-to-br from-white to-gray-50 border border-gray-200/60 shadow-md shadow-gray-100',
    bordered: 'bg-white border-2 border-emerald-100',
  };

  return (
    <div
      className={cn(
        'rounded-xl backdrop-blur-sm',
        variants[variant],
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function CardHeader({ title, subtitle, action, className, icon }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-4', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-100">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={cn(
              'text-xs font-medium mt-2 flex items-center gap-1',
              trend.positive ? 'text-emerald-600' : 'text-red-600'
            )}>
              <span>{trend.positive ? '↑' : '↓'}</span>
              {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        {icon && (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center border border-emerald-100">
            {icon}
          </div>
        )}
      </div>
      {/* Decorative element */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full opacity-50" />
    </Card>
  );
}

