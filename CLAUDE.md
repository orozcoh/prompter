# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI image generation platform. Users upload a reference image, select a prompt style from a catalog, and receive an AI-generated image. Features x402 protocol for pay-per-use API calls with on-chain USDC payments on Base.

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Cloudflare Workers with Hono
- **Storage**: Cloudflare KV (prompts), Cloudflare R2 (catalog images)
- **AI**: OpenRouter API (sourceful/riverflow-v2-fast-preview model)
- **Payments**: x402 protocol + USDC on Base (viem for EVM interactions)
- **Runtime**: Bun

## Commands

```bash
# Install dependencies
bun install

# Development (local - no Cloudflare needed)
bun run dev:local          # Run worker with in-memory KV/R2 mocks (port 8787)
cd frontend && bun dev     # Start Vite dev server (port 3000)

# Development (with Cloudflare Workers)
bun run dev                # Start Workers dev server via wrangler (port 8787)

# Build
bun run build:frontend     # Build frontend to dist/
bun run build:worker       # Dry-run worker deployment
bun run build              # Build both

# Deploy
bun run deploy             # Deploy worker to Cloudflare

# Lint
bun run lint               # Run ESLint on frontend
```

### Bun Conventions

This project uses Bun instead of Node.js/npm/pnpm:
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Use `bunx` instead of `npx`
- Bun automatically loads `.env` files

## Architecture

```
prompter/
├── worker/
│   ├── index.ts           # Hono app with API routes
│   ├── dev.ts             # Local dev server with in-memory KV/R2 mocks
│   └── utils/
│       └── verifyPayment.ts  # On-chain USDC payment verification
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageUpload.tsx         # Reference image upload with drag-drop
│   │   │   ├── PromptGallery.tsx       # Prompt catalog grid
│   │   │   ├── StatusIndicator.tsx     # Generation status UI
│   │   │   ├── PaywallModal.tsx        # x402 payment modal
│   │   │   └── WalletSelectionModal.tsx # Wallet connect/injected selector
│   │   ├── hooks/
│   │   │   └── useX402Payment.ts       # x402 payment hook (wallet, sign, verify)
│   │   ├── utils/
│   │   │   ├── extractImageUrl.ts      # Parse OpenRouter API responses
│   │   │   └── walletConnect.ts        # WalletConnect integration
│   │   └── App.tsx                     # Main app component
│   └── vite.config.ts                  # Vite config with /api proxy to worker
├── wrangler.toml          # Cloudflare Workers config
└── package.json
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/prompts` | GET | List all prompts from KV |
| `/prompts/:id` | GET | Get single prompt by ID |
| `/generate` | POST | Generate image (returns 402 if payment required) |
| `/verify-payment` | POST | Verify on-chain payment and generate image |

### Data Flow

1. Frontend fetches prompts from `/prompts`
2. User uploads reference image (base64, not stored)
3. User clicks a prompt style → triggers generation
4. Frontend calls `/generate` with prompt ID + reference image
5. If payment required: server returns 402 with x402 payment details
6. User signs USDC transfer transaction via wallet
7. Frontend calls `/verify-payment` with tx hash
8. Worker verifies payment on-chain (viem + Base RPC)
9. On success, worker calls OpenRouter API
10. Generated image returned and auto-downloaded

### Payment Flow (x402)

- **Payment Required**: `/generate` returns HTTP 402 with `PAYMENT-REQUIRED` header containing x402 payment schema
- **User Payment**: Frontend uses `useX402Payment` hook to connect wallet, sign USDC transfer on Base
- **Verification**: `/verify-payment` verifies transaction on-chain using viem:
  - Checks transaction status and confirmations
  - Parses Transfer events from USDC contract
  - Validates amount and recipient address
  - Prevents replay attacks via KV tracking
- **Direct Payment**: Users send USDC directly to `X402_PAY_TO_ADDRESS` - no facilitator needed

### Frontend Proxy

Vite proxy in `frontend/vite.config.ts` rewrites `/api/*` to `http://localhost:8787/*`, allowing the frontend to call the worker without CORS issues during development.

### Environment Configuration

**wrangler.toml bindings:**
- `PROMPTS_KV` - KV namespace for prompt storage
- `IMAGES_R2` - R2 bucket for catalog images

**Secrets (via `wrangler secret put`):**
- `OPENROUTER_API_KEY` - OpenRouter API key
- \`GENERATION_LOW_MODEL\` - Optional: override the low-tier AI model
- \`GENERATION_HIGH_MODEL\` - Optional: override the high-tier AI model

**Environment Variables (wrangler.toml):**
- `BASE_RPC_URL` - Base network RPC (default: `https://mainnet.base.org`)
- `MIN_CONFIRMATIONS` - Required confirmations for payment (default: `3`)

**Local Development (.env):**
- `LOCAL_DEV_BYPASS_PAYMENT` - Set to `true` to skip payment validation
- `X402_LOW_PRICE_USD` / `X402_HIGH_PRICE_USD` - Tier-specific prices in USD
- `X402_PAY_TO_ADDRESS` - USDC recipient address

**Frontend:**
- `VITE_API_URL` - Optional: override API base URL (defaults to `http://localhost:8787`)

## Development Notes

- **Local dev**: `bun run dev:local` runs worker with in-memory KV/R2 (no Cloudflare account needed). Sample prompts are auto-seeded.
- **Payment bypass**: Set `LOCAL_DEV_BYPASS_PAYMENT=true` to skip payment validation during development
- **Ports**: Worker runs on 8787, Frontend runs on 3000
- **Test payments**: Use Base Sepolia for testing, Base Mainnet for production
