/**
 * ShariahComplianceCard - Display Shariah compliance results
 */
import { ShariahResult } from '@/types';
import { Card, CardHeader } from './Card';
import { ShariahBadge } from './ShariahBadge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ShariahComplianceCardProps {
  result: ShariahResult;
  className?: string;
}

export function ShariahComplianceCard({ result, className }: ShariahComplianceCardProps) {
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
            {result.compliant ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium text-gray-900">
              {result.compliant ? 'Compliant' : 'Non-Compliant'}
            </span>
          </div>
          <ShariahBadge status={result.haram_products_detected ? 'HARAM' : 'HALAL'} />
        </div>

        {/* Transaction Structure */}
        {result.transaction_structure_valid !== undefined && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">
              Transaction Structure:
            </div>
            <div className="text-sm text-gray-600">
              {result.transaction_structure_valid ? (
                <span className="text-green-600">✓ Valid Islamic contract structure</span>
              ) : (
                <span className="text-red-600">✗ Invalid structure detected</span>
              )}
            </div>
          </div>
        )}

        {/* Violations */}
        {result.violations && result.violations.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Compliance Violations:
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {result.violations.map((violation, index) => (
                <li key={index}>
                  {typeof violation === 'string' ? violation : JSON.stringify(violation)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Review Notes */}
        {result.review_notes && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">Review Notes:</div>
            <div className="text-sm text-gray-600">{result.review_notes}</div>
          </div>
        )}
      </div>
    </Card>
  );
}


