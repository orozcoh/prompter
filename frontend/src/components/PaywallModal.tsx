import './PaywallModal.css';
import type { PaymentRequiredResponse } from '../hooks/useX402Payment';

interface PaywallModalProps {
  isOpen: boolean;
  paymentRequired: PaymentRequiredResponse | null;
  isConnecting: boolean;
  isPaying: boolean;
  isConnected: boolean;
  isPaid: boolean;
  isVerifying: boolean;
  walletAddress: string | null;
  txHash: string | null;
  error: string | null;
  onConnectWallet: () => void;
  onPayAndGenerate: () => Promise<void>;
  onClose: () => void;
}

export function PaywallModal({
  isOpen,
  paymentRequired,
  isConnecting,
  isPaying,
  isConnected,
  isPaid,
  isVerifying,
  walletAddress,
  txHash,
  error,
  onConnectWallet,
  onPayAndGenerate,
  onClose,
}: PaywallModalProps) {
  if (!isOpen) return null;

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatPrice = (price: string) => {
    return price.replace('$', '$');
  };

  const getNetworkName = (network: string) => {
    if (network.includes('8453')) return 'Base Mainnet';
    if (network.includes('84532')) return 'Base Sepolia';
    return network;
  };

  const scheme = paymentRequired?.schemes?.[0];

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const explorerUrl = txHash ? `https://basescan.org/tx/${txHash}` : null;

  return (
    <div className="paywall-overlay" onClick={onClose}>
      <div className="paywall-modal" onClick={e => e.stopPropagation()}>
        <button className="paywall-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="paywall-content">
          {/* Header */}
          <div className="paywall-header">
            <div className="paywall-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="6" width="18" height="12" rx="2"/>
                <path d="M3 10h18"/>
                <path d="M7 15h.01"/>
                <path d="M11 15h2"/>
              </svg>
            </div>
            <h2>Payment Required</h2>
            <p className="paywall-subtitle">Complete payment to generate your AI image</p>
          </div>

          {/* Payment Details Card */}
          {scheme && (
            <div className="payment-details">
              <div className="payment-row">
                <span className="payment-label">Price</span>
                <span className="payment-value highlight">{formatPrice(scheme.price)}</span>
              </div>
              <div className="payment-row">
                <span className="payment-label">Network</span>
                <span className="payment-value">
                  <span className="network-badge">{getNetworkName(scheme.network)}</span>
                </span>
              </div>
              <div className="payment-row">
                <span className="payment-label">Payment Method</span>
                <span className="payment-value">USDC on Base</span>
              </div>
              <div className="payment-row">
                <span className="payment-label">Recipient</span>
                <div className="payment-value address-value">
                  <span className="address-text">{formatAddress(scheme.payTo)}</span>
                  <button
                    className="copy-button"
                    onClick={() => copyToClipboard(scheme.payTo)}
                    title="Copy address"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="payment-row">
                <span className="payment-label">Description</span>
                <span className="payment-value">{scheme.description || 'AI Image Generation'}</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="payment-error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Connection/Payment Steps */}
          <div className="payment-steps">
            {/* Step 1: Connect Wallet */}
            <div className={`payment-step ${isConnected ? 'completed' : ''} ${isConnecting ? 'active' : ''}`}>
              <div className="step-indicator">
                {isConnecting ? (
                  <div className="step-spinner"/>
                ) : isConnected ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <span>1</span>
                )}
              </div>
              <div className="step-content">
                <span className="step-title">Connect Wallet</span>
                {isConnected && walletAddress && (
                  <span className="step-subtitle">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 7h-9"/>
                      <path d="M14 17H5"/>
                      <circle cx="17" cy="17" r="3"/>
                      <circle cx="7" cy="7" r="3"/>
                    </svg>
                    {formatAddress(walletAddress)}
                  </span>
                )}
              </div>
              {!isConnected && (
                <button
                  className="step-action button-primary"
                  onClick={onConnectWallet}
                  disabled={isConnecting || isPaying || isVerifying}
                >
                  Connect
                </button>
              )}
            </div>

            {/* Step 2: Pay & Generate */}
            <div className={`payment-step ${isPaid ? 'completed' : ''} ${isPaying || isVerifying ? 'active' : ''}`}>
              <div className="step-indicator">
                {isPaying ? (
                  <div className="step-spinner"/>
                ) : isVerifying ? (
                  <div className="step-spinner"/>
                ) : isPaid ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <span>2</span>
                )}
              </div>
              <div className="step-content">
                <span className="step-title">
                  {isVerifying ? 'Verifying Payment...' : 'Pay & Generate'}
                </span>
                {isPaid && (
                  <span className="step-subtitle">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Payment sent
                  </span>
                )}
                {txHash && (
                  <a href={explorerUrl!} target="_blank" rel="noopener noreferrer" className="tx-link">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    View on Basescan
                  </a>
                )}
              </div>
              {isConnected && !isPaid && (
                <button
                  className="step-action button-primary"
                  onClick={onPayAndGenerate}
                  disabled={isPaying || isVerifying}
                >
                  {isPaying ? 'Sending...' : `Pay ${scheme ? formatPrice(scheme.price) : '$0.10'} & Generate`}
                </button>
              )}
            </div>
          </div>

          {/* Success State */}
          {isPaid && !isVerifying && (
            <div className="payment-success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>Payment verified! Generating your image...</span>
            </div>
          )}

          {/* Verifying State */}
          {isVerifying && (
            <div className="payment-verifying">
              <div className="verifying-spinner"/>
              <span>Verifying transaction on-chain...</span>
            </div>
          )}

          {/* Footer Info */}
          <div className="paywall-footer">
            <p>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              Secure payment powered by x402 Protocol
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
