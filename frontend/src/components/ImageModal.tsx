import type { StoredImage } from '../utils/imageStorage';

interface ImageModalProps {
  image: StoredImage | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

function formatCost(cost: string | undefined) {
  if (!cost) return '';
  const num = parseFloat(cost);
  if (isNaN(num)) return cost;
  return `$${num}`;
}

export function ImageModal({ image, isOpen, onClose }: ImageModalProps) {
  if (!isOpen || !image) return null;

  const download = () => {
    const link = document.createElement('a');
    link.href = image.imageUrl;
    link.download = image.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="image-modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="image-modal" onClick={e => e.stopPropagation()}>
        <button className="image-modal-close" onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="image-modal-body">
          <img src={image.imageUrl} alt={image.promptName || 'Generated image'} className="image-modal-img" />
        </div>

        <div className="image-modal-info">
          <div className="image-modal-actions">
            <button className="button primary" onClick={download}>
              <svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </button>
          </div>

          <div className="image-modal-metadata">
            <div className="metadata-row">
              <span className="metadata-label">Style</span>
              <span className="metadata-value">{image.promptName}</span>
            </div>
            <div className="metadata-row">
              <span className="metadata-label">File</span>
              <span className="metadata-value">{image.fileName}</span>
            </div>
            <div className="metadata-row">
              <span className="metadata-label">Created</span>
              <span className="metadata-value">{formatTimestamp(image.timestamp)}</span>
            </div>
            {image.cost && (
              <div className="metadata-row">
                <span className="metadata-label">Cost</span>
                <span className="metadata-value highlight">{formatCost(image.cost)}</span>
              </div>
            )}
            {image.model && (
              <div className="metadata-row">
                <span className="metadata-label">Model</span>
                <span className="metadata-value">{image.model}</span>
              </div>
            )}
            {image.txHash && (
              <div className="metadata-row">
                <span className="metadata-label">Transaction</span>
                <a
                  href={`https://basescan.org/tx/${image.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="metadata-value tx-link"
                >
                  {formatAddress(image.txHash)}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
