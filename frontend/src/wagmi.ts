import { createConfig, http, injected } from '@wagmi/core';
import { base } from 'viem/chains';
import { walletConnect } from '@wagmi/connectors';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '513332cf5c05e1de19195e7dd676a213';

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'dark',
        themeVariables: {
          '--wcm-z-index': '9999',
        },
      },
      metadata: {
        name: 'Prompter',
        description: 'AI Image Generation Platform',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : ''],
      },
    }),
  ],
  transports: {
    [base.id]: http(),
  },
});
