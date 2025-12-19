/**
 * AIScoreCard - Display AI risk scores with explainability
 */
import { AIDecision } from '@/types';
import { Card, CardHeader } from './Card';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface AIScoreCardProps {
  decision: AIDecision;
  className?: string;
}

export function AIScoreCard({ decision, className }: AIScoreCardProps) {
  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score?: number) => {
    if (!score) return 'bg-gray-100';
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-amber-100';
    return 'bg-red-100';
  };

  return (
    <Card className={className}>
      <CardHeader
        title="AI Risk Assessment"
        subtitle="Explainable AI decision with detailed reasoning"
      />
      
      <div className="space-y-4">
        {/* Decision Badge */}
        <div>
          <StatusBadge
            label={decision.decision}
            color={
              decision.decision === 'APPROVED'
                ? 'text-green-600'
                : decision.decision === 'REJECTED'
                ? 'text-red-600'
                : 'text-amber-600'
            }
            bgColor={
              decision.decision === 'APPROVED'
                ? 'bg-green-100'
                : decision.decision === 'REJECTED'
                ? 'bg-red-100'
                : 'bg-amber-100'
            }
          />
        </div>

        {/* Scores */}
        <div className="grid grid-cols-3 gap-4">
          {decision.credit_score !== undefined && (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {decision.credit_score}
              </div>
              <div className="text-xs text-gray-500 mt-1">Credit Score</div>
            </div>
          )}
          {decision.fraud_score !== undefined && (
            <div className="text-center">
              <div className={cn('text-2xl font-bold', getScoreColor(decision.fraud_score))}>
                {decision.fraud_score}
              </div>
              <div className="text-xs text-gray-500 mt-1">Fraud Risk</div>
            </div>
          )}
          {decision.delivery_reliability_score !== undefined && (
            <div className="text-center">
              <div className={cn('text-2xl font-bold', getScoreColor(decision.delivery_reliability_score))}>
                {decision.delivery_reliability_score}
              </div>
              <div className="text-xs text-gray-500 mt-1">Delivery Reliability</div>
            </div>
          )}
        </div>

        {/* Reasoning */}
        {decision.reasoning && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">AI Reasoning:</div>
            <div className="text-sm text-gray-600">{decision.reasoning}</div>
          </div>
        )}

        {/* Risk Factors */}
        {decision.risk_factors && decision.risk_factors.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Risk Factors:
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {decision.risk_factors.map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

