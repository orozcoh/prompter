import { useState, useCallback } from 'react';
import { type Address, encodeFunctionData, parseAbi, type Hash } from 'viem';
import { base } from 'viem/chains';
import { x402Client, x402HTTPClient } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { toClientEvmSigner } from '@x402/evm';
import { encodePaymentSignatureHeader } from '@x402/core/http';

// USDC ABI for transfer function
const USDC_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
]);

// USDC contract address on Base
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export interface PaymentRequiredResponse {
  x402Version: number;
  schemes: Array<{
    scheme: string;
    network: string;
    price: string;
    amount?: string; // Raw amount in smallest units (e.g., USDC wei)
    payTo: Address;
    maxTimeoutSeconds: number;
    resource: string;
    mimeType: string;
    description: string;
    extra?: {
      asset?: string;
      name?: string;
      version?: string;
      [key: string]: any;
    };
  }>;
  message: string;
}

export interface PaymentState {
  isPaying: boolean;
  isPaid: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  isVerifying: boolean;
  error: string | null;
  paymentRequired: PaymentRequiredResponse | null;
  rawPaymentRequired: any | null; // Store raw decoded PAYMENT-REQUIRED header
  walletAddress: Address | null;
  chainId: number | null;
  txHash: string | null;
}

export function useX402Payment() {
  const [state, setState] = useState<PaymentState>({
    isPaying: false,
    isPaid: false,
    isConnecting: false,
    isConnected: false,
    isVerifying: false,
    error: null,
    paymentRequired: null,
    rawPaymentRequired: null,
    walletAddress: null,
    chainId: null,
    txHash: null,
  });

  // Connect wallet using viem wallet connectors
  const connectWallet = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      if (typeof window === 'undefined') {
        throw new Error('Window object not available');
      }

      const { createWalletClient, custom, publicActions } = await import('viem');
      const ethereum = (window as any).ethereum;

      if (!ethereum) {
        throw new Error('No Ethereum wallet found. Please install MetaMask or another Web3 wallet.');
      }

      const walletClient = createWalletClient({
        chain: base,
        transport: custom(ethereum),
      }).extend(publicActions);

      const [address] = await walletClient.requestAddresses();

      if (!address) {
        throw new Error('No account selected');
      }

      const chainId = await walletClient.getChainId();

      if (chainId !== base.id) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${base.id.toString(16)}` }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${base.id.toString(16)}`,
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

      setState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: true,
        walletAddress: address,
        chainId: base.id,
      }));

      return { walletClient, address };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
      throw error;
    }
  }, []);

  // Create USDC transfer transaction data
  const createUSDCTransaction = useCallback((paymentDetails: {
    payTo: Address;
    amount: string; // Raw amount in USDC smallest units (6 decimals)
  }) => {
    if (!state.walletAddress) {
      throw new Error('Wallet not connected');
    }

    const transferData = encodeFunctionData({
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [paymentDetails.payTo, BigInt(paymentDetails.amount)],
    });

    return {
      to: USDC_CONTRACT as Address,
      data: transferData,
      value: 0n,
      from: state.walletAddress,
    };
  }, [state.walletAddress]);

  // Sign and send USDC transfer transaction
  const signAndSendTransaction = useCallback(async (
    paymentDetails: {
      payTo: Address;
      amount: string;
    }
  ): Promise<Hash> => {
    setState(prev => ({ ...prev, isPaying: true, error: null }));

    try {
      let address: Address;

      if (!state.isConnected || !state.walletAddress) {
        const result = await connectWallet();
        address = result.address as Address;
      } else {
        address = state.walletAddress;
      }

      const { createWalletClient, custom, publicActions } = await import('viem');
      const ethereum = (window as any).ethereum;

      const walletClient = createWalletClient({
        chain: base,
        transport: custom(ethereum),
        account: address,
      }).extend(publicActions);

      // Simulate the transaction first (optional but recommended)
      try {
        await walletClient.simulateContract({
          account: address,
          address: USDC_CONTRACT as Address,
          abi: USDC_ABI,
          functionName: 'transfer',
          args: [paymentDetails.payTo, BigInt(paymentDetails.amount)],
        });
      } catch (simError: any) {
        console.warn('Transaction simulation failed:', simError);
        // Continue anyway - simulation can fail for various reasons
      }

      // Write (sign and send) the transaction
      const hash = await walletClient.writeContract({
        account: address,
        address: USDC_CONTRACT as Address,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [paymentDetails.payTo, BigInt(paymentDetails.amount)],
      });

      setState(prev => ({
        ...prev,
        isPaying: false,
        isPaid: true,
        txHash: hash,
      }));

      return hash;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isPaying: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
      }));
      throw error;
    }
  }, [state.isConnected, state.walletAddress, connectWallet]);

  // Verify payment with worker
  const verifyPayment = useCallback(async (
    txHash: string,
    promptId: string,
    referenceImage?: string
  ): Promise<Response> => {
    setState(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

      const response = await fetch(`${API_BASE}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash,
          promptId,
          referenceImage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Verification failed' }));
        throw new Error(errorData.reason || errorData.error || 'Payment verification failed');
      }

      setState(prev => ({
        ...prev,
        isVerifying: false,
      }));

      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isVerifying: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      }));
      throw error;
    }
  }, []);

  // Make payment using x402
  const makePayment = useCallback(async (
    paymentRequired: PaymentRequiredResponse,
    originalRequest: () => Promise<Response>
  ): Promise<Response> => {
    setState(prev => ({ ...prev, isPaying: true, error: null }));

    try {
      let address: Address;

      if (!state.isConnected || !state.walletAddress) {
        const result = await connectWallet();
        address = result.address as Address;
      } else {
        address = state.walletAddress;
      }

      // Create viem wallet client for signing with public actions
      const { createWalletClient, custom, publicActions } = await import('viem');
      const ethereum = (window as any).ethereum;

      const walletClient = createWalletClient({
        chain: base,
        transport: custom(ethereum),
        account: address,
      }).extend(publicActions);

      // Create signer from viem wallet client - the walletClient now has account set
      const signer = toClientEvmSigner(
        {
          address,
          signTypedData: walletClient.signTypedData.bind(walletClient),
          signTransaction: walletClient.signTransaction?.bind(walletClient),
          readContract: walletClient.readContract.bind(walletClient),
        },
        {
          readContract: walletClient.readContract.bind(walletClient),
          getTransactionCount: walletClient.getTransactionCount?.bind(walletClient),
          estimateFeesPerGas: walletClient.estimateFeesPerGas?.bind(walletClient),
        }
      );

      // Get the first scheme from payment required
      const scheme = paymentRequired.schemes[0];
      if (!scheme) {
        throw new Error('No payment scheme available');
      }

      // Prepare the request body from the original request
      const response = await originalRequest();
      const bodyText = await response.clone().text();
      const url = response.url;

      // Use the raw payment required from state if available, otherwise reconstruct
      const paymentRequiredInput = (state.rawPaymentRequired?.accepts?.length > 0) ? state.rawPaymentRequired : {
        x402Version: paymentRequired.x402Version || 2,
        error: 'Payment required',
        accepts: paymentRequired.schemes.map(s => ({
          scheme: s.scheme,
          network: s.network as `eip155:${number}`,
          amount: s.amount,
          maxTimeoutSeconds: s.maxTimeoutSeconds || 300,
          payTo: (s.payTo || s.extra?.payTo) as Address,
          asset: (s.extra?.asset || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as Address,
          extra: {
            asset: (s.extra?.asset || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as Address,
            name: s.extra?.name || 'USD Coin',
            version: s.extra?.version || '2',
          },
        })),
        resource: {
          url: scheme.resource || url,
          description: scheme.description || 'AI image generation',
          mimeType: scheme.mimeType || 'application/json',
        },
      };

      // Create x402 client and register EVM scheme
      const client = new x402Client()
        .register('eip155:*', new ExactEvmScheme(signer));

      // Create HTTP client for payment operations
      const httpClient = new x402HTTPClient(client);

      // Create payment payload from the payment required object
      const paymentPayload = await httpClient.createPaymentPayload(paymentRequiredInput);

      // Encode payment signature header using the imported function
      const paymentHeader = encodePaymentSignatureHeader(paymentPayload);

      // Retry the original request with payment header
      const paymentResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PAYMENT-SIGNATURE': paymentHeader,
        },
        body: bodyText,
      });

      // Check if payment was accepted
      if (paymentResponse.status === 402) {
        const errorBody = await paymentResponse.text();
        throw new Error(`Payment rejected: ${errorBody}`);
      }

      setState(prev => ({ ...prev, isPaying: false, isPaid: true }));

      return paymentResponse;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isPaying: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      }));
      throw error;
    }
  }, [state.isConnected, state.walletAddress, state.rawPaymentRequired, connectWallet]);

  // Format payment required response to our interface
  const formatPaymentRequired = (data: any): PaymentRequiredResponse => {
    // Transform x402 accepts array to our schemes format
    const schemes = (data.accepts || []).map((accept: any) => {
      const payTo = accept.payTo || accept.extra?.payTo;
      return {
        scheme: accept.scheme,
        network: accept.network,
        price: accept.amount ? `$${(parseInt(accept.amount) / 1e6).toFixed(2)}` : '$0.10',
        amount: accept.amount, // Keep raw amount for payment
        payTo,
        maxTimeoutSeconds: accept.maxTimeoutSeconds || 300,
        resource: data.resource?.url || '/',
        mimeType: data.resource?.mimeType || 'application/json',
        description: data.resource?.description || 'AI image generation',
        extra: accept.extra || {},
      };
    });

    return {
      x402Version: data.x402Version || 2,
      schemes,
      message: data.error || 'Payment required',
    };
  };

  // Parse 402 response
  const parsePaymentRequired = useCallback(async (response: Response): Promise<PaymentRequiredResponse | null> => {
    if (response.status !== 402) return null;

    try {
      // Clone response to avoid consuming the body stream
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();

      // Check for x402 headers (various formats)
      const paymentRequiredHeader = response.headers.get('x402-payment-required');
      const paymentRequiredHeaderUpper = response.headers.get('PAYMENT-REQUIRED');
      let parsed: PaymentRequiredResponse | null = null;
      let decoded: any = null; // Store the decoded header for rawPaymentRequired

      // Try PAYMENT-REQUIRED header first (base64 encoded)
      if (paymentRequiredHeaderUpper) {
        try {
          decoded = JSON.parse(atob(paymentRequiredHeaderUpper));
          parsed = formatPaymentRequired(decoded);
        } catch (err) {
          console.error('Failed to decode PAYMENT-REQUIRED header:', err);
        }
      }

      // Try x402-payment-required header
      if (!parsed && paymentRequiredHeader) {
        try {
          decoded = JSON.parse(decodeURIComponent(paymentRequiredHeader));
          parsed = formatPaymentRequired(decoded);
        } catch {
          // Fall through to body parsing
        }
      }

      // Try to parse from body
      if (!parsed && (data?.schemes || data?.x402Version)) {
        decoded = data;
        parsed = formatPaymentRequired(data);
      }

      // Set state if we successfully parsed payment required
      if (parsed) {
        setState(prev => ({
          ...prev,
          paymentRequired: parsed,
          rawPaymentRequired: decoded, // Store the decoded header (not body data)
        }));
        return parsed;
      }

      return null;
    } catch (err) {
      console.error('[parsePaymentRequired] Error:', err);
      return null;
    }
  }, []);

  // Reset payment state
  const resetPayment = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaid: false,
      isPaying: false,
      isVerifying: false,
      paymentRequired: null,
      rawPaymentRequired: null,
      txHash: null,
      error: null,
    }));
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      isPaid: false,
      walletAddress: null,
      chainId: null,
    }));
  }, []);

  return {
    ...state,
    connectWallet,
    makePayment,
    createUSDCTransaction,
    signAndSendTransaction,
    verifyPayment,
    parsePaymentRequired,
    resetPayment,
    disconnectWallet,
  };
}
