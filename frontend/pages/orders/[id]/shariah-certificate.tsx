/**
 * Shariah Compliance Certificate Page
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ShariahCertificate } from '@/types';
import { 
  ArrowLeft, 
  CheckCircle, 
  Shield, 
  FileCheck,
  Download,
  Loader2,
  AlertCircle,
  BadgeCheck
} from 'lucide-react';

export default function ShariahCertificatePage() {
  const router = useRouter();
  const { id: orderId } = router.query;
  
  const [certificate, setCertificate] = useState<ShariahCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId && typeof orderId === 'string') {
      fetchCertificate(orderId);
    }
  }, [orderId]);

  const fetchCertificate = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getShariahCertificate(id);
      setCertificate(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // In a real implementation, this would generate a PDF
    // For now, we'll just alert
    alert('PDF download would be implemented here');
  };

  if (loading) {
    return (
      <DashboardLayout title="Shariah Certificate" role="buyer">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !certificate) {
    return (
      <DashboardLayout title="Shariah Certificate" role="buyer">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Certificate Not Available</h2>
          <p className="text-gray-500 mb-4">{error || 'Certificate could not be loaded.'}</p>
          <Link href={`/buyer/orders/${orderId}`}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Order
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Shariah Certificate" role="buyer">
      <Head>
        <title>Shariah Compliance Certificate | Shariah Escrow</title>
      </Head>

      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <Link href={`/buyer/orders/${orderId}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Order
        </Link>

        {/* Certificate Card */}
        <Card className="relative overflow-hidden">
          {/* Decorative Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-10 h-10" />
                <div>
                  <h1 className="text-2xl font-bold">Shariah Compliance Certificate</h1>
                  <p className="text-green-100">Islamic Finance Verification</p>
                </div>
              </div>
              <BadgeCheck className="w-16 h-16 text-green-200" />
            </div>
          </div>

          {/* Certificate Body */}
          <div className="p-8">
            {/* Certificate ID & Status */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b">
              <div>
                <p className="text-sm text-gray-500">Certificate ID</p>
                <p className="text-lg font-mono font-semibold">{certificate.certificate_id}</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">COMPLIANT</span>
              </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
              {/* Order Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Order Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Order Number</p>
                    <p className="font-medium">{certificate.order_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contract Type</p>
                    <p className="font-medium capitalize">{certificate.contract_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Order Amount</p>
                    <p className="font-medium">{formatCurrency(certificate.order_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Currency</p>
                    <p className="font-medium">{certificate.currency}</p>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Product Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Product Name</p>
                    <p className="font-medium">{certificate.product_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-medium">{certificate.product_category}</p>
                  </div>
                </div>
              </div>

              {/* Parties */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Transaction Parties
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Buyer</p>
                    <p className="font-medium">{certificate.buyer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Seller</p>
                    <p className="font-medium">{certificate.seller_name}</p>
                  </div>
                </div>
              </div>

              {/* Validation Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Validation Details
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Validation Method</p>
                      <p className="font-medium capitalize">{certificate.validation_method.replace('_', ' ')}</p>
                    </div>
                    {certificate.compliance_score && (
                      <div>
                        <p className="text-sm text-gray-500">Compliance Score</p>
                        <p className="font-medium text-green-600">{certificate.compliance_score}%</p>
                      </div>
                    )}
                  </div>
                  
                  {certificate.principles_validated.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Principles Validated</p>
                      <div className="flex flex-wrap gap-2">
                        {certificate.principles_validated.map((principle, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                          >
                            {principle}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {certificate.rules_applied.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Rules Applied</p>
                      <div className="flex flex-wrap gap-2">
                        {certificate.rules_applied.map((rule, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-mono"
                          >
                            {rule}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Certification Dates
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Validated At</p>
                    <p className="font-medium">{formatDate(certificate.validated_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Certificate Issued</p>
                    <p className="font-medium">{formatDate(certificate.certificate_issued_at)}</p>
                  </div>
                </div>
              </div>

              {/* Verification */}
              <div className="pt-6 border-t mt-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Verification Code</p>
                    <p className="font-mono text-lg font-semibold">{certificate.verification_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Issued By</p>
                    <p className="font-medium">{certificate.issued_by}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-8 py-4 flex justify-between items-center">
            <p className="text-xs text-gray-500">
              This certificate confirms Shariah compliance for the specified transaction.
            </p>
            <Button onClick={handleDownload} variant="primary">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
