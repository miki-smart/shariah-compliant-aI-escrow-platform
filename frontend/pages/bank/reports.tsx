/**
 * Bank Reports Page - Financial and compliance reports
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  FileText, 
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Shield,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Filter
} from 'lucide-react';
import { useState } from 'react';

type ReportPeriod = '7d' | '30d' | '90d' | '1y' | 'all';

const periodOptions = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

export default function BankReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('30d');

  const { data: escrowStats } = useQuery('escrow-stats', () => 
    apiClient.getEscrowStats()
  );

  const { data: complianceStats } = useQuery('compliance-stats', () => 
    apiClient.getComplianceStats()
  );

  // Mock report data - in real app would be fetched from API
  const reportData = {
    totalVolume: 4850000,
    volumeChange: 12.5,
    totalTransactions: 342,
    transactionChange: 8.3,
    avgTransactionSize: 14181,
    avgChange: 3.2,
    complianceRate: 98.2,
    complianceChange: 0.5,
    releaseTime: 2.3, // days
    releaseTimeChange: -0.4,
    disputeRate: 1.8,
    disputeChange: -0.3,
  };

  const monthlyData = [
    { month: 'Jul', volume: 380000, transactions: 28 },
    { month: 'Aug', volume: 420000, transactions: 32 },
    { month: 'Sep', volume: 395000, transactions: 30 },
    { month: 'Oct', volume: 510000, transactions: 41 },
    { month: 'Nov', volume: 485000, transactions: 38 },
    { month: 'Dec', volume: 520000, transactions: 43 },
  ];

  const reportTypes = [
    { 
      id: 'financial', 
      title: 'Financial Summary', 
      description: 'Complete overview of escrow transactions and releases',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    { 
      id: 'compliance', 
      title: 'Shariah Compliance Report', 
      description: 'Detailed compliance validation results and violations',
      icon: Shield,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      id: 'audit', 
      title: 'Audit Trail Report', 
      description: 'Complete audit log of all system activities',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    { 
      id: 'disputes', 
      title: 'Disputes Report', 
      description: 'Summary of disputes and resolutions',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100'
    },
  ];

  return (
    <DashboardLayout role="BANK">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500 mt-1">View financial and compliance reports</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 border-0 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Total Volume</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(reportData.totalVolume)}</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm">{reportData.volumeChange}% from last period</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{reportData.totalTransactions}</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm">{reportData.transactionChange}%</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Transaction Size</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(reportData.avgTransactionSize)}</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm">{reportData.avgChange}%</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Compliance Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{reportData.complianceRate}%</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-sm">+{reportData.complianceChange}%</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Release Time</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{reportData.releaseTime} days</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-600">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="text-sm">{reportData.releaseTimeChange} days</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Dispute Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{reportData.disputeRate}%</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-600">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="text-sm">{reportData.disputeChange}%</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <PieChart className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Monthly Volume Chart Placeholder */}
        <Card>
          <CardHeader 
            title="Monthly Transaction Volume"
            subtitle="Escrow volume over the past 6 months"
          />
          <div className="mt-4">
            <div className="flex items-end justify-between gap-2 h-48">
              {monthlyData.map((data, idx) => (
                <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-gradient-to-t from-amber-500 to-orange-400 rounded-t-lg transition-all hover:opacity-80"
                    style={{ height: `${(data.volume / 550000) * 100}%` }}
                  />
                  <span className="text-xs text-gray-500">{data.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Highest</p>
                <p className="font-bold text-gray-900">{formatCurrency(520000)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Average</p>
                <p className="font-bold text-gray-900">{formatCurrency(451667)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lowest</p>
                <p className="font-bold text-gray-900">{formatCurrency(380000)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Generate Reports */}
        <Card>
          <CardHeader 
            title="Generate Reports"
            subtitle="Download detailed reports in PDF or Excel format"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTypes.map((report) => (
              <div
                key={report.id}
                className="p-4 rounded-xl border-2 border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${report.bgColor} flex items-center justify-center`}>
                    <report.icon className={`w-6 h-6 ${report.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
                      {report.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Scheduled Reports */}
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Scheduled Reports</h3>
                <p className="text-sm text-gray-500">Set up automatic report generation and delivery</p>
              </div>
            </div>
            <Button variant="outline">
              Configure
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
