import { useState } from 'react';

interface PaymentModalProps {
  isOpen: boolean;
  amount: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PaymentModal({ isOpen, amount, onConfirm, onCancel, isLoading }: PaymentModalProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const handleConnectWallet = async () => {
    // Check if MetaMask or similar is available
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      alert('Please install a Web3 wallet like MetaMask');
    }
  };

  const handleConfirm = () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    onConfirm();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Complete Payment</h3>

        <div className="payment-info">
          <p className="amount">Amount: {amount} USDC</p>
          <p className="network">Network: Base</p>
          <p className="token">Token: USDC</p>
        </div>

        {!walletAddress ? (
          <div className="wallet-connect">
            <button
              className="button primary"
              onClick={handleConnectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : (
          <div className="wallet-connected">
            <p className="wallet-address">
              Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
        )}

        <div className="modal-actions">
          <button className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="button primary"
            onClick={handleConfirm}
            disabled={!walletAddress || isLoading}
          >
            {isLoading ? 'Processing...' : 'Pay & Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Web3 type declarations
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string }) => Promise<string[]>;
    };
  }
}
