import { useState, useCallback, useEffect } from 'react';
import { type Address, encodeFunctionData, parseAbi, type Hash, publicActions } from 'viem';
import { base } from 'viem/chains';
import { x402Client, x402HTTPClient } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { toClientEvmSigner } from '@x402/evm';
import { encodePaymentSignatureHeader } from '@x402/core/http';
import {
  connect,
  disconnect,
  reconnect,
  getAccount,
  watchAccount,
  getWalletClient,
  switchChain,
} from '@wagmi/core';
import { config } from '../wagmi';

const USDC_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
]);

const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export interface PaymentRequiredResponse {
  x402Version: number;
  schemes: Array<{
    scheme: string;
    network: string;
    price: string;
    amount?: string;
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
  rawPaymentRequired: any | null;
  walletAddress: Address | null;
  chainId: number | null;
  txHash: string | null;
  connectionType: 'injected' | 'walletconnect' | null;
}

function connectorIdToType(id: string | undefined): 'injected' | 'walletconnect' | null {
  if (id === 'injected') return 'injected';
  if (id === 'walletConnect') return 'walletconnect';
  return null;
}

async function ensureBaseChain(): Promise<void> {
  const current = getAccount(config);
  if (current.chainId !== base.id) {
    try {
      await switchChain(config, { chainId: base.id });
    } catch {
      throw new Error('Please switch to Base Mainnet network');
    }
  }
}

async function getExtendedWalletClient(address: Address) {
  const client = await getWalletClient(config, { account: address, chainId: base.id });
  return client.extend(publicActions);
}

export function useX402Payment() {
  const [state, setState] = useState<PaymentState>(() => {
    const account = getAccount(config);
    return {
      isPaying: false,
      isPaid: false,
      isConnecting: false,
      isConnected: account.isConnected,
      isVerifying: false,
      error: null,
      paymentRequired: null,
      rawPaymentRequired: null,
      walletAddress: (account.address as Address) || null,
      chainId: account.chainId ?? null,
      txHash: null,
      connectionType: connectorIdToType(account.connector?.id),
    };
  });

  useEffect(() => {
    reconnect(config);

    const unwatch = watchAccount(config, {
      onChange(data) {
        setState(prev => ({
          ...prev,
          isConnected: data.isConnected,
          walletAddress: (data.address as Address) || null,
          chainId: data.chainId ?? null,
          error: null,
          connectionType: connectorIdToType(data.connector?.id),
        }));
      },
    });

    return () => {
      unwatch();
    };
  }, []);

  const connectWallet = useCallback(async (connectionType?: 'injected' | 'walletconnect') => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      if (typeof window === 'undefined') {
        throw new Error('Window object not available');
      }

      const connectorId = connectionType === 'walletconnect' ? 'walletConnect' : 'injected';
      const connector = config.connectors.find(c => c.id === connectorId);

      if (!connector) {
        throw new Error(`Wallet connector "${connectionType}" not available`);
      }

      const result = await connect(config, { connector });

      if (!result.accounts?.[0]) {
        throw new Error('No account selected');
      }

      if (result.chainId !== base.id) {
        try {
          await switchChain(config, { chainId: base.id });
        } catch {
          throw new Error('Please switch to Base Mainnet network');
        }
      }

      const walletClient = await getExtendedWalletClient(result.accounts[0] as Address);

      setState(prev => ({
        ...prev,
        isConnecting: false,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { walletClient: walletClient as any, address: result.accounts[0] as Address };
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
      throw error;
    }
  }, []);

  const createUSDCTransaction = useCallback((paymentDetails: {
    payTo: Address;
    amount: string;
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

      await ensureBaseChain();

      const walletClient = await getExtendedWalletClient(address);

      try {
        await walletClient.simulateContract({
          account: address,
          address: USDC_CONTRACT as Address,
          abi: USDC_ABI,
          functionName: 'transfer',
          args: [paymentDetails.payTo, BigInt(paymentDetails.amount)],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      } catch {
        // Continue anyway - simulation can fail for various reasons
      }

      const hash = await walletClient.writeContract({
        account: address,
        address: USDC_CONTRACT as Address,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [paymentDetails.payTo, BigInt(paymentDetails.amount)],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      setState(prev => ({
        ...prev,
        isPaying: false,
        isPaid: true,
        txHash: hash,
      }));

      return hash;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isPaying: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
      }));
      throw error;
    }
  }, [state.isConnected, state.walletAddress, connectWallet]);

  const verifyPayment = useCallback(async (
    txHash: string,
    promptId: string,
    referenceImage?: string,
    modelTier?: string
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
          modelTier,
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

      await ensureBaseChain();

      const walletClient = await getExtendedWalletClient(address);

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

      const scheme = paymentRequired.schemes[0];
      if (!scheme) {
        throw new Error('No payment scheme available');
      }

      const response = await originalRequest();
      const bodyText = await response.clone().text();
      const url = response.url;

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

      const client = new x402Client()
        .register('eip155:*', new ExactEvmScheme(signer));

      const httpClient = new x402HTTPClient(client);

      const paymentPayload = await httpClient.createPaymentPayload(paymentRequiredInput);

      const paymentHeader = encodePaymentSignatureHeader(paymentPayload);

      const paymentResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PAYMENT-SIGNATURE': paymentHeader,
        },
        body: bodyText,
      });

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

  const formatPaymentRequired = (data: any): PaymentRequiredResponse => {
    const schemes = (data.accepts || []).map((accept: any) => {
      const payTo = accept.payTo || accept.extra?.payTo;
      return {
        scheme: accept.scheme,
        network: accept.network,
        price: accept.amount ? `$${(parseInt(accept.amount) / 1e6).toFixed(2)}` : '$0.10',
        amount: accept.amount,
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

  const parsePaymentRequired = useCallback(async (response: Response): Promise<PaymentRequiredResponse | null> => {
    if (response.status !== 402) return null;

    try {
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();

      const paymentRequiredHeader = response.headers.get('x402-payment-required');
      const paymentRequiredHeaderUpper = response.headers.get('PAYMENT-REQUIRED');
      let parsed: PaymentRequiredResponse | null = null;
      let decoded: any = null;

      if (paymentRequiredHeaderUpper) {
        try {
          decoded = JSON.parse(atob(paymentRequiredHeaderUpper));
          parsed = formatPaymentRequired(decoded);
        } catch {
          // Ignore decoding errors
        }
      }

      if (!parsed && paymentRequiredHeader) {
        try {
          decoded = JSON.parse(decodeURIComponent(paymentRequiredHeader));
          parsed = formatPaymentRequired(decoded);
        } catch {
          // Fall through to body parsing
        }
      }

      if (!parsed && (data?.schemes || data?.x402Version)) {
        decoded = data;
        parsed = formatPaymentRequired(data);
      }

      if (parsed) {
        setState(prev => ({
          ...prev,
          paymentRequired: parsed,
          rawPaymentRequired: decoded,
        }));
        return parsed;
      }

      return null;
    } catch {
      return null;
    }
  }, []);

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

  const disconnectWalletHook = useCallback(() => {
    disconnect(config);

    setState(prev => ({
      ...prev,
      isConnected: false,
      isPaid: false,
      walletAddress: null,
      chainId: null,
      connectionType: null,
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
    disconnectWallet: disconnectWalletHook,
  };
}
