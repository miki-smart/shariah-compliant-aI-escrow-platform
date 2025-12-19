import React, { useState } from 'react';
import { 
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Lock,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface EscrowTransaction {
  id: string;
  escrow_id: string;
  transaction_type: string;
  status: string;
  amount: number;
  currency: string;
  from_account?: string;
  to_account?: string;
  reference_number: string;
  external_reference?: string;
  initiated_by?: string;
  initiator_type: string;
  description?: string;
  processed_at?: string;
  failure_reason?: string;
  created_at: string;
}

interface TransactionHistoryCardProps {
  transactions: EscrowTransaction[];
  isLoading?: boolean;
  onRefresh?: () => void;
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const getTransactionIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'deposit':
    case 'fund':
    case 'lock':
      return ArrowDownCircle;
    case 'release':
    case 'release_to_seller':
      return ArrowUpCircle;
    case 'refund':
    case 'refund_to_buyer':
    case 'refund_to_bank':
      return RefreshCw;
    case 'freeze':
      return Lock;
    default:
      return AlertTriangle;
  }
};

const getTransactionColor = (type: string, status: string) => {
  if (status.toLowerCase() === 'failed') {
    return 'text-red-600 bg-red-50';
  }
  
  switch (type.toLowerCase()) {
    case 'deposit':
    case 'fund':
    case 'lock':
      return 'text-green-600 bg-green-50';
    case 'release':
    case 'release_to_seller':
      return 'text-blue-600 bg-blue-50';
    case 'refund':
    case 'refund_to_buyer':
    case 'refund_to_bank':
      return 'text-amber-600 bg-amber-50';
    case 'freeze':
      return 'text-purple-600 bg-purple-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const formatTransactionType = (type: string): string => {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function TransactionHistoryCard({
  transactions,
  isLoading = false,
  onRefresh,
  showPagination = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange
}: TransactionHistoryCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
            <p className="text-sm text-gray-500">
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh transactions"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
      
      {/* Transaction List */}
      <div className="divide-y divide-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <p>No transactions yet</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const Icon = getTransactionIcon(tx.transaction_type);
            const colorClasses = getTransactionColor(tx.transaction_type, tx.status);
            const isExpanded = expandedId === tx.id;
            
            return (
              <div key={tx.id} className="hover:bg-gray-50 transition-colors">
                <div 
                  className="px-6 py-4 cursor-pointer"
                  onClick={() => toggleExpanded(tx.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${colorClasses.split(' ')[1]}`}>
                        <Icon className={`w-5 h-5 ${colorClasses.split(' ')[0]}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatTransactionType(tx.transaction_type)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`font-semibold ${
                          tx.transaction_type.toLowerCase().includes('release') || 
                          tx.transaction_type.toLowerCase().includes('refund')
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {tx.transaction_type.toLowerCase().includes('release') ||
                           tx.transaction_type.toLowerCase().includes('refund') 
                            ? '-' : '+'}
                          {formatCurrency(tx.amount)}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          tx.status.toLowerCase() === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : tx.status.toLowerCase() === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-4">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reference:</span>
                        <span className="font-mono text-gray-900">{tx.reference_number}</span>
                      </div>
                      {tx.from_account && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">From:</span>
                          <span className="text-gray-900">{tx.from_account}</span>
                        </div>
                      )}
                      {tx.to_account && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">To:</span>
                          <span className="text-gray-900">{tx.to_account}</span>
                        </div>
                      )}
                      {tx.external_reference && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">External Ref:</span>
                          <span className="font-mono text-gray-900">{tx.external_reference}</span>
                        </div>
                      )}
                      {tx.description && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-gray-500">Notes:</span>
                          <p className="mt-1 text-gray-700">{tx.description}</p>
                        </div>
                      )}
                      {tx.failure_reason && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-red-600">Failure Reason:</span>
                          <p className="mt-1 text-red-700">{tx.failure_reason}</p>
                        </div>
                      )}
                      {tx.processed_at && (
                        <div className="flex justify-between text-xs pt-2 border-t border-gray-200">
                          <span className="text-gray-500">Processed:</span>
                          <span className="text-gray-700">{formatDate(tx.processed_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
