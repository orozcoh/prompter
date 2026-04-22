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

const statusConfig: Record<GenerationStatus, { label: string; icon: string; color: string }> = {
  idle: { label: '', icon: '', color: '' },
  'generating': { label: 'Generating image...', icon: '🎨', color: '#3b82f6' },
  'completed': { label: 'Image generated!', icon: '✓', color: '#10b981' },
  'error': { label: 'Error', icon: '✕', color: '#ef4444' },
  'payment_required': { label: 'Payment Required', icon: '💳', color: '#f59e0b' },
};

export function StatusIndicator({ status, error }: StatusIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  const config = statusConfig[status];

  return (
    <div className={`status-indicator status-${status}`} style={{ borderColor: config.color }}>
      <span className="status-icon" style={{ color: config.color }}>{config.icon}</span>
      <span className="status-label" style={{ color: config.color }}>{config.label}</span>
      {error && status === 'error' && (
        <span className="status-error">{error}</span>
      )}
    </div>
  );
}
