import './PaywallModal.css';
import { X, CreditCard, Clipboard, AlertCircle, Check, Link2, ExternalLink, ShieldCheck, Info } from 'lucide-react';
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
        <button className="paywall-close" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>

        <div className="paywall-content">
          {/* Header */}
          <div className="paywall-header">
            <div className="paywall-icon">
              <CreditCard size={48} />
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
                    <Clipboard size={14} />
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
              <AlertCircle size={20} />
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
                  <Check size={20} />
                ) : (
                  <span>1</span>
                )}
              </div>
              <div className="step-content">
                <span className="step-title">Connect Wallet</span>
                {isConnected && walletAddress && (
                  <span className="step-subtitle">
                    <Link2 size={14} />
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
                  <Check size={20} />
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
                    <Check size={14} />
                    Payment sent
                  </span>
                )}
                {txHash && (
                  <a href={explorerUrl!} target="_blank" rel="noopener noreferrer" className="tx-link">
                    <ExternalLink size={12} />
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
              <ShieldCheck size={24} />
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
              <Info size={14} />
              Secure payment powered by x402 Protocol
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
