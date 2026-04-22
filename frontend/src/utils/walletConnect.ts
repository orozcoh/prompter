import EthereumProvider from '@walletconnect/ethereum-provider';
import { type Address } from 'viem';

// WalletConnect project ID (required for WalletConnect Cloud)
// Get your own from https://cloud.walletconnect.com - it's free and safe to expose client-side
// For local development without a valid ID, WalletConnect will still work but without analytics
const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '513332cf5c05e1de19195e7dd676a213';

// Required chains for Base Mainnet
const REQUIRED_CHAINS = [8453]; // Base Mainnet chainId

// Optional chains for additional networks
const OPTIONAL_CHAINS = [8453, 1, 11155111]; // Base, Ethereum, Sepolia

let walletConnectProvider: EthereumProvider | null = null;

export interface WalletConnectResult {
  provider: EthereumProvider;
  address: Address;
  chainId: number;
}

/**
 * Initialize and connect WalletConnect
 * Displays QR code for wallet scanning
 */
export async function connectWalletConnect(options: { showQrModal?: boolean; skipConnect?: boolean } = {}): Promise<WalletConnectResult> {
  try {
        // Initialize provider if not already initialized, or if we need to change the QR modal setting
    // (e.g. if it was initialized silently for recovery but now the user wants to connect manually)
    const shouldShowQr = options.showQrModal ?? true;
    
    if (!walletConnectProvider) {
      walletConnectProvider = await EthereumProvider.init({
        projectId: PROJECT_ID,
        chains: REQUIRED_CHAINS,
        optionalChains: OPTIONAL_CHAINS as [number, ...number[]],
        showQrModal: shouldShowQr,
        qrModalOptions: {
          themeMode: 'dark',
          themeVariables: {
            '--wcm-z-index': '9999',
          },
        },
        metadata: {
          name: 'Prompter',
          description: 'AI Image Generation Platform',
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.svg`],
        },
      });
    }

    // Connect to wallet - this triggers the QR modal
    const provider = walletConnectProvider;

    // Call connect() first to show QR modal and establish connection
    if (!provider.connected && !options.skipConnect) {
      try {
        await provider.connect({
          optionalChains: OPTIONAL_CHAINS,
        });
      } catch (connectError) {
        throw connectError;
      }
    }

    // Get accounts from the connected provider
    const accounts = provider.accounts as Address[];

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned from WalletConnect');
    }

    const chainIdNum = provider.chainId;

    // Switch to Base if not already connected
    if (chainIdNum !== 8453) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // 8453 in hex
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          // Chain not added to wallet - add Base network
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x2105',
                chainName: 'Base Mainnet',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org'],
              },
            ],
          });
        } else {
          throw new Error('Please switch to Base Mainnet network');
        }
      }
    }

    return {
      provider,
      address: accounts[0],
      chainId: 8453,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to connect WalletConnect');
  }
}

/**
 * Disconnect WalletConnect session
 */
export async function disconnectWalletConnect(): Promise<void> {
  if (walletConnectProvider) {
    try {
      await walletConnectProvider.disconnect();
      walletConnectProvider = null;
    } catch (error) {
      // Silently ignore disconnect errors
    }
  }
}

/**
 * Get current WalletConnect provider
 */
export function getWalletConnectProvider(): EthereumProvider | null {
  return walletConnectProvider;
}

/**
 * Check if WalletConnect is connected
 */
export function isWalletConnectConnected(): boolean {
  return walletConnectProvider !== null &&
         walletConnectProvider.accounts?.length > 0;
}

/**
 * Ensure WalletConnect is connected to Base Mainnet
 * Switches chain if necessary
 */
export async function ensureBaseChain(): Promise<void> {
  if (!walletConnectProvider) {
    throw new Error('WalletConnect provider not initialized');
  }

  const currentChainId = walletConnectProvider.chainId;

  if (currentChainId !== 8453) {
    try {
      await walletConnectProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // 8453 in hex
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Chain not added to wallet - add Base network
        await walletConnectProvider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x2105',
              chainName: 'Base Mainnet',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            },
          ],
        });
      } else {
        throw new Error('Please switch to Base Mainnet network');
      }
    }
  }
}
