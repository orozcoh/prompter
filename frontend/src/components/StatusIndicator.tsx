import { CreditCard, Check, X } from 'lucide-react';
import './StatusIndicator.css';

export type GenerationStatus =
  | 'idle'
  | 'generating'
  | 'completed'
  | 'error'
  | 'payment_required';

interface StatusIndicatorProps {
  status: GenerationStatus;
  error?: string | null;
}

const statusConfig: Record<GenerationStatus, { label: string }> = {
  idle: { label: '' },
  'generating': { label: '> EXECUTING...' },
  'completed': { label: '> COMPLETE' },
  'error': { label: '> ERROR' },
  'payment_required': { label: '> PAYMENT REQUIRED' },
};

const StatusIcon = ({ status }: { status: GenerationStatus }) => {
  const size = 20;
  switch (status) {
    case 'generating':
      return (
        <span className="data-stream" aria-hidden="true">
          <span className="data-stream-dot" />
          <span className="data-stream-dot" />
          <span className="data-stream-dot" />
          <span className="data-stream-dot" />
          <span className="data-stream-dot" />
        </span>
      );
    case 'completed':
      return <Check size={size} aria-hidden="true" />;
    case 'error':
      return <X size={size} aria-hidden="true" />;
    case 'payment_required':
      return <CreditCard size={size} aria-hidden="true" />;
    default:
      return null;
  }
};

export function StatusIndicator({ status, error }: StatusIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  const config = statusConfig[status];

  return (
    <div
      className={`status-indicator status-${status}`}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      role={status === 'error' ? 'alert' : 'status'}
    >
      <span className="status-icon">
        <StatusIcon status={status} />
      </span>
      <span className="status-label">{config.label}</span>
      {error && status === 'error' && (
        <span className="status-error">{error}</span>
      )}
    </div>
  );
}
