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

const statusConfig: Record<GenerationStatus, { label: string; icon: string }> = {
  idle: { label: '', icon: '' },
  'generating': { label: 'Generating image...', icon: '🎨' },
  'completed': { label: 'Image generated!', icon: '✓' },
  'error': { label: 'Error', icon: '✕' },
  'payment_required': { label: 'Payment Required', icon: '💳' },
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
      <span className="status-icon">{config.icon}</span>
      <span className="status-label">{config.label}</span>
      {error && status === 'error' && (
        <span className="status-error">{error}</span>
      )}
    </div>
  );
}
