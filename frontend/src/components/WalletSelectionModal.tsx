import { X, ChevronRight } from 'lucide-react';
import './PaywallModal.css';

interface WalletSelectionModalProps {
  isOpen: boolean;
  isConnecting: boolean;
  hasInjectedWallet: boolean;
  onSelectWallet: (type: 'injected' | 'walletconnect') => Promise<void>;
  onClose: () => void;
}

export function WalletSelectionModal({
  isOpen,
  isConnecting,
  hasInjectedWallet,
  onSelectWallet,
  onClose,
}: WalletSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="paywall-overlay" onClick={onClose}>
      <div className="paywall-modal wallet-selection-modal" onClick={e => e.stopPropagation()}>
        <button className="paywall-close" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>

        <div className="paywall-content">
          <div className="wallet-selection-header">
            <h3>Connect Wallet</h3>
            <p>Choose your preferred wallet connection method</p>
          </div>

          {isConnecting ? (
            <div className="wallet-connecting">
              <div className="connecting-spinner"/>
              <p>Connecting to wallet...</p>
            </div>
          ) : (
            <div className="wallet-options">
              {/* Injected Wallet Option (MetaMask, etc.) */}
              {hasInjectedWallet && (
                <button
                  className="wallet-option"
                  onClick={() => onSelectWallet('injected')}
                >
                  <div className="wallet-icon metamask">
                    <img src="/MM_Logo.svg" alt="MetaMask" width="24" height="24" />
                  </div>
                  <div className="wallet-info">
                    <span className="wallet-name">MetaMask</span>
                    <span className="wallet-description">Use your installed wallet extension</span>
                  </div>
                  <div className="wallet-arrow">
                    <ChevronRight size={20} />
                  </div>
                </button>
              )}

              {/* WalletConnect Option */}
              <button
                className="wallet-option"
                onClick={() => onSelectWallet('walletconnect')}
              >
                <div className="wallet-icon walletconnect">
                  <img src="/WC_Logo.svg" alt="WalletConnect" width="24" height="24" />
                </div>
                <div className="wallet-info">
                  <span className="wallet-name">WalletConnect</span>
                  <span className="wallet-description">Scan QR code with your mobile wallet</span>
                </div>
                <div className="wallet-arrow">
                  <ChevronRight size={20} />
                </div>
              </button>

              {/* No wallet message */}
              {!hasInjectedWallet && (
                <div className="no-wallet-hint">
                  No wallet extension detected. Use WalletConnect or install MetaMask.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
