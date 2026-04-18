import React from 'react';
import { useWallet } from '../context/WalletContext';
import './StatusBar.css';

interface StatusBarProps {
  onConnectClick?: () => void;
}

export function StatusBar({ onConnectClick }: StatusBarProps) {
  const { isConnected, walletAddress, disconnectWallet } = useWallet();

  const formatAddress = (address: string | undefined | null) => {
    if (!address) return '';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    disconnectWallet();
  };

  const handleStatusBarClick = () => {
    if (!isConnected && onConnectClick) {
      onConnectClick();
    }
  };

  return (
    <div className="status-bar" onClick={handleStatusBarClick}>
      <div className="status-bar-item">
        <span 
          className={`status-dot ${isConnected ? 'dot-green' : 'dot-gray'}`}
        />
        <span className="status-text">
          {isConnected ? (
            <>
              {formatAddress(walletAddress)}
              <button 
                className="disconnect-btn"
                onClick={handleDisconnect}
                title="Disconnect wallet"
              >
                🚪
              </button>
            </>
          ) : <span style={{cursor: "pointer"}}>Not connected</span>}
        </span>
      </div>
    </div>
  );
}
