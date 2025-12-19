import React, { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  LockClosedIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  TruckIcon,
  BanknotesIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import Button from './Button';

interface ReleaseCondition {
  name: string;
  label: string;
  status: 'met' | 'not_met' | 'pending' | 'not_applicable';
  is_required: boolean;
  checked_at?: string;
  details?: string;
}

interface ReleaseConditionsProps {
  orderId: string;
  conditions: ReleaseCondition[];
  canRelease: boolean;
  allConditionsMet: boolean;
  escrowAmount: number;
  currency: string;
  escrowStatus: string;
  blockingReasons: string[];
  onReleaseClick?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isReleasing?: boolean;
  showReleaseButton?: boolean;
  userRole?: string;
}

const getConditionIcon = (name: string) => {
  switch (name) {
    case 'shariah_compliant':
      return ShieldCheckIcon;
    case 'ai_approved':
      return ScaleIcon;
    case 'delivery_confirmed':
      return TruckIcon;
    case 'no_disputes':
      return ExclamationTriangleIcon;
    case 'escrow_funded':
      return BanknotesIcon;
    default:
      return CheckCircleIcon;
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'met':
      return {
        icon: CheckCircleIcon,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Met'
      };
    case 'not_met':
      return {
        icon: XCircleIcon,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Not Met'
      };
    case 'pending':
      return {
        icon: ClockIcon,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        label: 'Pending'
      };
    default:
      return {
        icon: ClockIcon,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: 'N/A'
      };
  }
};

export default function ReleaseConditionsCard({
  orderId,
  conditions,
  canRelease,
  allConditionsMet,
  escrowAmount,
  currency,
  escrowStatus,
  blockingReasons,
  onReleaseClick,
  onRefresh,
  isLoading = false,
  isReleasing = false,
  showReleaseButton = true,
  userRole = 'BUYER'
}: ReleaseConditionsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const metConditions = conditions.filter(c => c.status === 'met').length;
  const totalRequired = conditions.filter(c => c.is_required).length;
  
  const progress = totalRequired > 0 ? (metConditions / totalRequired) * 100 : 0;
  
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${canRelease ? 'bg-green-100' : 'bg-amber-100'}`}>
              <LockClosedIcon className={`w-5 h-5 ${canRelease ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Release Gate</h3>
              <p className="text-sm text-gray-500">
                {metConditions} of {totalRequired} conditions met
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh conditions"
              >
                <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                progress === 100 ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Conditions List */}
      {isExpanded && (
        <div className="px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {conditions.map((condition) => {
                const statusConfig = getStatusConfig(condition.status);
                const ConditionIcon = getConditionIcon(condition.name);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div
                    key={condition.name}
                    className={`flex items-center justify-between p-3 rounded-lg border ${statusConfig.borderColor} ${statusConfig.bgColor}`}
                  >
                    <div className="flex items-center gap-3">
                      <ConditionIcon className={`w-5 h-5 ${statusConfig.color}`} />
                      <div>
                        <p className="font-medium text-gray-900">{condition.label}</p>
                        {condition.details && (
                          <p className="text-sm text-gray-600">{condition.details}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {condition.is_required && (
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                          Required
                        </span>
                      )}
                      <StatusIcon className={`w-6 h-6 ${statusConfig.color}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Blocking Reasons */}
          {!canRelease && blockingReasons.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5" />
                Release Blocked
              </h4>
              <ul className="mt-2 space-y-1">
                {blockingReasons.map((reason, idx) => (
                  <li key={idx} className="text-sm text-red-700">• {reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Footer / Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Release Amount</p>
            <p className="text-xl font-bold text-gray-900">
              {currency} {escrowAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          {showReleaseButton && (
            <div className="flex gap-2">
              {canRelease ? (
                <Button
                  onClick={onReleaseClick}
                  disabled={isReleasing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isReleasing ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircleSolid className="w-4 h-4 mr-2" />
                      Release Payment
                    </>
                  )}
                </Button>
              ) : userRole === 'BANK' ? (
                <Button
                  onClick={onReleaseClick}
                  variant="outline"
                  className="border-amber-500 text-amber-600 hover:bg-amber-50"
                >
                  Manual Override
                </Button>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Awaiting conditions to be met
                </p>
              )}
            </div>
          )}
        </div>
        
        {canRelease && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
            <CheckCircleSolid className="w-4 h-4" />
            All conditions met - Ready for release
          </div>
        )}
      </div>
    </div>
  );
}
