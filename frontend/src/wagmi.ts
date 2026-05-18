import { createConfig, http } from '@wagmi/core'
import { walletConnect, injected } from '@wagmi/connectors'
import { base } from 'viem/chains'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      metadata: {
        name: 'Prompter',
        description: 'AI Image Generation Platform',
        url: 'https://ai.digitalerror.xyz',
        icons: ['https://ai.digitalerror.xyz/favicon-96x96.png'],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [base.id]: http(),
  },
})
