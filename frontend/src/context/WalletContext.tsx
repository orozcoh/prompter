import React, { createContext, useContext, type ReactNode, useMemo } from 'react';
import { useX402Payment, type PaymentState } from '../hooks/useX402Payment';

interface WalletContextType extends PaymentState {
  connectWallet: (type?: 'injected' | 'walletconnect') => Promise<any>;
  makePayment: (paymentRequired: any, originalRequest: () => Promise<Response>) => Promise<Response>;
  createUSDCTransaction: (paymentDetails: { payTo: any; amount: string }) => { to: any; data: any; value: any; from: any };
  signAndSendTransaction: (paymentDetails: { payTo: any; amount: string }) => Promise<string>;
  verifyPayment: (txHash: string, promptId: string, referenceImage?: string) => Promise<Response>;
  parsePaymentRequired: (response: Response) => Promise<any>;
  resetPayment: () => void;
  disconnectWallet: () => void;
  hasInjectedWallet: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const paymentHook = useX402Payment();

  const hasInjectedWallet = useMemo(
    () => typeof window !== 'undefined' && !!(window as any).ethereum,
    []
  );

  const value = {
    ...paymentHook,
    hasInjectedWallet,
  } as WalletContextType;

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
