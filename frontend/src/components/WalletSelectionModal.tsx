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
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10.5096 2.83281L1.776 7.10761C1.2416 7.36921 0.926392 8.09641 1.1152 8.90601L3.078 17.3148C3.2964 18.25 4.4844 19.1316 5.3868 19.4076L10.6524 21.022C10.8804 21.0924 11.0676 20.9748 11.1348 20.8212L11.9668 18.9268C12.066 18.7004 12.2892 18.558 12.534 18.558H13.4676C13.7124 18.558 13.934 18.7004 14.0348 18.9268L14.8668 20.8212C14.934 20.9748 15.1212 21.0924 15.3492 21.022L20.6148 19.4076C21.5172 19.1316 22.7052 18.25 22.9236 17.3148L24.8864 8.90601C25.0752 8.09641 24.76 7.36921 24.2256 7.10761L15.492 2.83281C15.0564 2.61961 14.3444 2.61961 13.9088 2.83281L12.8988 3.32681C12.618 3.46441 12.2892 3.46441 12.0084 3.32681L11 2.83281C10.5644 2.61961 9.8524 2.61961 9.4168 2.83281H10.5096ZM15.8628 12.9612C15.5052 13.3188 14.9268 13.3188 14.5692 12.9612C14.2116 12.6036 14.2116 12.0252 14.5692 11.6676C14.9268 11.31 15.5052 11.31 15.8628 11.6676C16.2204 12.0252 16.2204 12.6036 15.8628 12.9612ZM10.2204 12.9612C9.8628 13.3188 9.2844 13.3188 8.9268 12.9612C8.5692 12.6036 8.5692 12.0252 8.9268 11.6676C9.2844 11.31 9.8628 11.31 10.2204 11.6676C10.578 12.0252 10.578 12.6036 10.2204 12.9612Z"/>
                    </svg>
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7.5 4.5C7.5 4.5 9 3 12 3C15 3 16.5 4.5 16.5 4.5"/>
                    <path d="M4.5 9C4.5 9 7 5 12 5C17 5 19.5 9 19.5 9"/>
                    <path d="M2.5 15.5C2.5 15.5 5.5 10 12 10C18.5 10 21.5 15.5 21.5 15.5"/>
                    <path d="M12 15.5C13.5 15.5 15 17 15 17"/>
                    <path d="M12 15.5V21.5"/>
                    <path d="M9 18.5L12 21.5L15 18.5"/>
                  </svg>
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
