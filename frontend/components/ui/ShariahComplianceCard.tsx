/**
 * ShariahComplianceCard - Display Shariah compliance results
 */
import { ShariahResult, ShariahComplianceStatus, ShariahStatusResponse } from '@/types';
import { Card, CardHeader } from './Card';
import { ShariahBadge } from './ShariahBadge';
import { Button } from './Button';
import { CheckCircle2, XCircle, AlertCircle, Clock, FileCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ShariahComplianceCardProps {
  result?: ShariahResult | null;
  status?: ShariahStatusResponse | null;
  orderId: string;
  showCertificateLink?: boolean;
  showValidateButton?: boolean;
  onValidate?: () => void;
  validating?: boolean;
  className?: string;
}

const getStatusConfig = (status?: ShariahComplianceStatus) => {
  switch (status) {
    case ShariahComplianceStatus.COMPLIANT:
      return { 
        label: 'Compliant', 
        color: 'text-green-700', 
        bgColor: 'bg-green-100',
        icon: CheckCircle2,
        iconColor: 'text-green-600'
      };
    case ShariahComplianceStatus.NON_COMPLIANT:
      return { 
        label: 'Non-Compliant', 
        color: 'text-red-700', 
        bgColor: 'bg-red-100',
        icon: XCircle,
        iconColor: 'text-red-600'
      };
    case ShariahComplianceStatus.REQUIRES_REVIEW:
      return { 
        label: 'Requires Review', 
        color: 'text-yellow-700', 
        bgColor: 'bg-yellow-100',
        icon: AlertCircle,
        iconColor: 'text-yellow-600'
      };
    case ShariahComplianceStatus.VIOLATION_DETECTED:
      return { 
        label: 'Violation Detected', 
        color: 'text-red-700', 
        bgColor: 'bg-red-100',
        icon: XCircle,
        iconColor: 'text-red-600'
      };
    default:
      return { 
        label: 'Pending', 
        color: 'text-gray-700', 
        bgColor: 'bg-gray-100',
        icon: Clock,
        iconColor: 'text-gray-500'
      };
  }
};

export function ShariahComplianceCard({ 
  result, 
  status,
  orderId,
  showCertificateLink = true,
  showValidateButton = false,
  onValidate,
  validating = false,
  className 
}: ShariahComplianceCardProps) {
  const currentStatus = result?.status || status?.status;
  const config = getStatusConfig(currentStatus);
  const StatusIcon = config.icon;
  const isCompliant = currentStatus === ShariahComplianceStatus.COMPLIANT;
  const isPending = !currentStatus || currentStatus === ShariahComplianceStatus.PENDING;

  return (
    <Card className={className}>
      <CardHeader
        title="Shariah Compliance"
        subtitle="Islamic finance compliance validation"
      />
      
      <div className="space-y-4">
        {/* Compliance Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
            <span className={`font-medium ${config.color}`}>
              {config.label}
            </span>
          </div>
          <ShariahBadge status={result?.haram_products_detected ? 'HARAM' : (isCompliant ? 'HALAL' : 'PENDING')} />
        </div>

        {/* Compliance Score */}
        {result?.compliance_score !== undefined && result.compliance_score !== null && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Compliance Score</span>
              <span className={`text-lg font-semibold ${
                result.compliance_score >= 80 ? 'text-green-600' : 
                result.compliance_score >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {result.compliance_score.toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* Validation Checks */}
        {result && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Validation Checks:</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className={`flex items-center gap-1 ${result.product_is_halal ? 'text-green-600' : 'text-red-600'}`}>
                {result.product_is_halal ? '✓' : '✗'} Product Halal
              </div>
              <div className={`flex items-center gap-1 ${result.contract_type_valid ? 'text-green-600' : 'text-red-600'}`}>
                {result.contract_type_valid ? '✓' : '✗'} Valid Contract
              </div>
              <div className={`flex items-center gap-1 ${result.no_riba_detected ? 'text-green-600' : 'text-red-600'}`}>
                {result.no_riba_detected ? '✓' : '✗'} No Riba
              </div>
              <div className={`flex items-center gap-1 ${result.no_gharar_detected ? 'text-green-600' : 'text-red-600'}`}>
                {result.no_gharar_detected ? '✓' : '✗'} No Gharar
              </div>
            </div>
          </div>
        )}

        {/* Violations */}
        {result?.violations && result.violations.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Violations ({result.violation_count}):
            </div>
            <ul className="space-y-2">
              {result.violations.slice(0, 3).map((violation, index) => (
                <li key={index} className="p-2 bg-red-50 rounded text-sm">
                  <div className="font-medium text-red-800">{violation.rule_name}</div>
                  <div className="text-red-600">{violation.description}</div>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                    violation.severity === 'critical' ? 'bg-red-200 text-red-800' :
                    violation.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                    'bg-yellow-200 text-yellow-800'
                  }`}>
                    {violation.severity}
                  </span>
                </li>
              ))}
            </ul>
            {result.violations.length > 3 && (
              <p className="text-sm text-gray-500 mt-2">
                +{result.violations.length - 3} more violations
              </p>
            )}
          </div>
        )}

        {/* Review Notes */}
        {result?.review_notes && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">Review Notes:</div>
            <div className="text-sm text-gray-600">{result.review_notes}</div>
          </div>
        )}

        {/* Explanation */}
        {result?.explanation && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">Explanation:</div>
            <div className="text-sm text-gray-600">{result.explanation}</div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t space-y-2">
          {showValidateButton && isPending && onValidate && (
            <Button 
              onClick={onValidate} 
              disabled={validating}
              className="w-full"
              variant="primary"
            >
              {validating ? 'Validating...' : 'Validate Compliance'}
            </Button>
          )}
          
          {showCertificateLink && isCompliant && (
            <Link href={`/orders/${orderId}/shariah-certificate`}>
              <Button variant="outline" className="w-full">
                <FileCheck className="w-4 h-4 mr-2" />
                View Compliance Certificate
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}


