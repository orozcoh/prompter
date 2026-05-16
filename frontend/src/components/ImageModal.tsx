import { X, Download, ExternalLink } from 'lucide-react';
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
          <X size={24} />
        </button>

        <div className="image-modal-body">
          <img src={image.imageUrl} alt={image.promptName || 'Generated image'} className="image-modal-img" loading="lazy" />
        </div>

        <div className="image-modal-info">
          <div className="image-modal-actions">
            <button className="button primary" onClick={download}>
              <Download className="icon" size={18} />
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
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
