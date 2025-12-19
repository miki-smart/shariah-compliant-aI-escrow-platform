/**
 * Bank Shariah Compliance Page - Monitor shariah compliance status
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Shield, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileCheck,
  Search,
  Filter,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

type ComplianceStatus = 'all' | 'compliant' | 'non_compliant' | 'pending' | 'requires_review';

const complianceFilters = [
  { value: 'all', label: 'All' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'pending', label: 'Pending' },
  { value: 'requires_review', label: 'Review Required' },
  { value: 'non_compliant', label: 'Non-Compliant' },
];

const getComplianceConfig = (status: string) => {
  switch (status) {
    case 'COMPLIANT':
      return { 
        label: 'Compliant', 
        icon: CheckCircle2, 
        color: 'text-emerald-600', 
        bgColor: 'bg-emerald-100' 
      };
    case 'NON_COMPLIANT':
      return { 
        label: 'Non-Compliant', 
        icon: XCircle, 
        color: 'text-red-600', 
        bgColor: 'bg-red-100' 
      };
    case 'REQUIRES_REVIEW':
      return { 
        label: 'Review Required', 
        icon: AlertTriangle, 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-100' 
      };
    default:
      return { 
        label: 'Pending', 
        icon: Clock, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-100' 
      };
  }
};

export default function BankCompliancePage() {
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: complianceResults, isLoading, refetch } = useQuery('shariah-compliance', () => 
    apiClient.getAllShariahResults()
  );

  const filteredResults = complianceResults?.filter((r: any) => {
    if (statusFilter !== 'all' && r.compliance_status?.toLowerCase() !== statusFilter) return false;
    if (searchTerm && !r.order_id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total: complianceResults?.length || 0,
    compliant: complianceResults?.filter((r: any) => r.compliance_status === 'COMPLIANT').length || 0,
    pending: complianceResults?.filter((r: any) => r.compliance_status === 'PENDING').length || 0,
    flagged: complianceResults?.filter((r: any) => ['NON_COMPLIANT', 'REQUIRES_REVIEW'].includes(r.compliance_status)).length || 0,
  };

  const complianceRate = stats.total > 0 ? ((stats.compliant / stats.total) * 100).toFixed(1) : 0;

  return (
    <DashboardLayout role="BANK">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shariah Compliance</h1>
            <p className="text-gray-500 mt-1">Monitor transaction compliance with Shariah principles</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="primary">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Compliance Rate</p>
                <p className="text-3xl font-bold mt-1">{complianceRate}%</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Compliant</p>
                <p className="text-xl font-bold text-gray-900">{stats.compliant}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Flagged</p>
                <p className="text-xl font-bold text-gray-900">{stats.flagged}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {complianceFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value as ComplianceStatus)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Compliance Results */}
        <Card>
          <CardHeader 
            title="Compliance Validations"
            subtitle={`${filteredResults?.length || 0} results`}
          />
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredResults?.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No compliance results found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults?.map((result: any) => {
                const config = getComplianceConfig(result.compliance_status);
                const StatusIcon = config.icon;
                
                return (
                  <div 
                    key={result.id}
                    className={`p-4 rounded-xl border-2 ${
                      result.compliance_status === 'NON_COMPLIANT' ? 'border-red-200 bg-red-50' :
                      result.compliance_status === 'REQUIRES_REVIEW' ? 'border-amber-200 bg-amber-50' :
                      result.compliance_status === 'COMPLIANT' ? 'border-emerald-200 bg-emerald-50' :
                      'border-gray-200 bg-gray-50'
                    } transition-all hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                          <StatusIcon className={`w-6 h-6 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Order #{result.order_id?.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Validated: {formatDate(result.validated_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            {config.label}
                          </span>
                          {result.rules_checked && (
                            <p className="text-xs text-gray-500 mt-1">
                              {result.rules_passed}/{result.rules_checked} rules passed
                            </p>
                          )}
                        </div>
                        
                        <Link href={`/bank/orders/${result.order_id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    
                    {result.violations && result.violations.length > 0 && (
                      <div className="mt-3 p-3 bg-white/50 rounded-lg">
                        <p className="text-sm font-medium text-red-700 mb-2">Violations Found:</p>
                        <ul className="space-y-1">
                          {result.violations.map((v: any, idx: number) => (
                            <li key={idx} className="text-sm text-red-600 flex items-start gap-2">
                              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              {v.rule_name}: {v.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Shariah Principles Card */}
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Shariah Compliance Principles</h3>
              <p className="text-sm text-gray-600 mt-1">
                All transactions are validated against core Islamic finance principles:
              </p>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {['No Riba (Interest)', 'No Gharar (Uncertainty)', 'No Maisir (Gambling)', 'Halal Products Only'].map((principle) => (
                  <div key={principle} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {principle}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
