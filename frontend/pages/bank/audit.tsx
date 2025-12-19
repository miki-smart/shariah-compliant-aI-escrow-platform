/**
 * Bank Audit Page - View audit logs and compliance information
 */
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { 
  AuditLogEntry, 
  AuditLogListResponse, 
  AuditLogSummary 
} from '@/types';
import { formatDate } from '@/lib/utils';
import { 
  Shield, 
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export default function BankAuditPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    entity_type: '',
    action: '',
    actor_type: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch audit summary
  const { data: summary, isLoading: summaryLoading } = useQuery<AuditLogSummary>(
    ['audit-summary'],
    () => apiClient.getAuditSummary(7),
    { refetchInterval: 30000 }
  );

  // Fetch audit logs
  const { data: logsData, isLoading: logsLoading, refetch } = useQuery<AuditLogListResponse>(
    ['audit-logs', page, filters],
    () => apiClient.getAuditLogs({ 
      page, 
      page_size: 20,
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      )
    }),
    { keepPreviousData: true }
  );

  // Fetch available entity types
  const { data: entityTypes } = useQuery<string[]>(
    ['audit-entity-types'],
    () => apiClient.getAuditEntityTypes()
  );

  // Fetch available actions
  const { data: actionTypes } = useQuery<string[]>(
    ['audit-actions'],
    () => apiClient.getAuditActions()
  );

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('approved') || action.includes('validated')) {
      return 'text-green-600 bg-green-50';
    }
    if (action.includes('rejected') || action.includes('violation') || action.includes('error')) {
      return 'text-red-600 bg-red-50';
    }
    if (action.includes('frozen') || action.includes('reverted')) {
      return 'text-amber-600 bg-amber-50';
    }
    return 'text-blue-600 bg-blue-50';
  };

  const formatActionName = (action: string): string => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <DashboardLayout role="BANK">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-gray-600 mt-1">Monitor system activity and compliance</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Events (7d)</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_logs.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.success_rate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Recent Errors</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.recent_errors.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Entity Types</p>
                  <p className="text-2xl font-bold text-gray-900">{Object.keys(summary.logs_by_entity).length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Filters</span>
              {Object.values(filters).some(v => v !== '') && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  Active
                </span>
              )}
            </div>
            {showFilters ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showFilters && (
            <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity Type
                </label>
                <select
                  value={filters.entity_type}
                  onChange={(e) => setFilters(prev => ({ ...prev, entity_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Entity Types</option>
                  {entityTypes?.map(type => (
                    <option key={type} value={type}>{formatActionName(type)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Actions</option>
                  {actionTypes?.map(action => (
                    <option key={action} value={action}>{formatActionName(action)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actor Type
                </label>
                <select
                  value={filters.actor_type}
                  onChange={(e) => setFilters(prev => ({ ...prev, actor_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Actors</option>
                  <option value="user">User</option>
                  <option value="system">System</option>
                  <option value="ai">AI</option>
                  <option value="bank">Bank</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="col-span-3 flex justify-end gap-2">
                <button
                  onClick={() => setFilters({ entity_type: '', action: '', actor_type: '' })}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => { setPage(1); refetch(); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : logsData?.logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No audit logs found
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logsData?.logs.map((log) => (
                <div key={log.id} className="hover:bg-gray-50 transition-colors">
                  <div
                    className="px-6 py-4 cursor-pointer"
                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {formatActionName(log.action)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{log.description}</p>
                          <p className="text-sm text-gray-500">
                            <span className="font-mono">{log.entity_type}</span>
                            <span className="mx-2">•</span>
                            <span>{log.actor_name || log.actor_type}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {formatDate(log.created_at)}
                        </div>
                        {log.success ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        {expandedLogId === log.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedLogId === log.id && (
                    <div className="px-6 pb-4">
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-500">Log ID:</span>
                            <p className="font-mono text-gray-900">{log.id}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Entity ID:</span>
                            <p className="font-mono text-gray-900">{log.entity_id}</p>
                          </div>
                          {log.actor_id && (
                            <div>
                              <span className="text-gray-500">Actor ID:</span>
                              <p className="font-mono text-gray-900">{log.actor_id}</p>
                            </div>
                          )}
                          {log.correlation_id && (
                            <div>
                              <span className="text-gray-500">Correlation ID:</span>
                              <p className="font-mono text-gray-900">{log.correlation_id}</p>
                            </div>
                          )}
                          {log.ip_address && (
                            <div>
                              <span className="text-gray-500">IP Address:</span>
                              <p className="font-mono text-gray-900">{log.ip_address}</p>
                            </div>
                          )}
                        </div>

                        {log.reason && (
                          <div className="pt-2 border-t border-gray-200">
                            <span className="text-gray-500">Reason:</span>
                            <p className="text-gray-900">{log.reason}</p>
                          </div>
                        )}

                        {log.error_message && (
                          <div className="pt-2 border-t border-gray-200">
                            <span className="text-red-600">Error:</span>
                            <p className="text-red-700">{log.error_message}</p>
                          </div>
                        )}

                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <div className="pt-2 border-t border-gray-200">
                            <span className="text-gray-500">Changes:</span>
                            <pre className="mt-1 p-2 bg-white rounded border border-gray-200 text-xs overflow-auto">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {logsData && logsData.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, logsData.total)} of {logsData.total} entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  Page {page} of {logsData.total_pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(logsData.total_pages, p + 1))}
                  disabled={page >= logsData.total_pages}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
