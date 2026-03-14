# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pay-per-prompt AI image generation platform using x402 protocol for crypto payments (USDC on Base). Users upload a reference image, select a prompt style from a catalog, pay via wallet, and receive an AI-generated image.

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Cloudflare Workers with Hono
- **Storage**: Cloudflare KV (prompts), Cloudflare R2 (catalog images)
- **AI**: OpenRouter API (nano-banana-pro model)
- **Payments**: x402 protocol with USDC on Base (chainId 8453)
- **Runtime**: Bun

## Commands

```bash
# Install dependencies
bun install

# Development (local - no Cloudflare needed)
bun run dev:local          # Run worker with in-memory KV/R2 mocks
cd frontend && bun dev     # Start Vite dev server (port 3000)

# Development (with Cloudflare Workers)
bun run dev                # Start Workers dev server (port 8787)

# Build
bun run build:frontend     # Build frontend to dist/
bun run build:worker       # Dry-run worker deployment
bun run build              # Build both

# Deploy
bun run deploy             # Deploy worker to Cloudflare
```

## Architecture

```
prompter/
├── worker/
│   ├── index.ts      # Hono app with API routes
│   ├── x402.ts       # x402 payment protocol implementation
│   └── dev.ts        # Local dev server with in-memory KV/R2 mocks
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ImageUpload.tsx
│       │   ├── PromptGallery.tsx
│       │   └── PaymentModal.tsx
│       └── App.tsx
├── wrangler.toml     # Cloudflare Workers config
└── package.json
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/prompts` | GET | List all prompts from KV |
| `/prompts/:id` | GET | Get single prompt by ID |
| `/generate` | POST | Generate image (requires x402 payment) |
| `/x402/pay` | POST | Process x402 payment |
| `/pricing` | GET | Get current pricing config (base cost + markup) |

### Runtime Configuration (KV)

Pricing is configurable via KV without redeployment:

| Key | Default | Description |
|-----|---------|-------------|
| `config:base_cost_usdc` | `500000` | Base cost in USDC (6 decimals) |
| `config:markup_percent` | `100` | Markup percentage (100 = 2x price) |

Final price = base_cost × (1 + markup_percent/100)

### Data Flow

1. Frontend fetches prompts from `/prompts`
2. User uploads reference image (base64, not stored)
3. User selects prompt → opens payment modal
4. User connects wallet and signs payment
5. Frontend calls `/x402/pay` to get payment token
6. Frontend calls `/generate` with payment token + prompt ID + reference image
7. Worker verifies payment, calls OpenRouter API
8. Generated image returned and auto-downloaded

### Environment Variables (wrangler.toml)

- `OPENROUTER_API_KEY` - OpenRouter API key
- `PROMPTS_KV` - KV namespace binding for prompts
- `IMAGES_R2` - R2 bucket binding for catalog images

## Cursor Rules

The project uses Bun instead of Node.js/npm/pnpm:
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Use `bunx` instead of `npx`
- Bun automatically loads `.env` files

## Development Notes

- **Local dev**: `bun run dev:local` runs worker with in-memory KV/R2 (no Cloudflare account needed)
- Worker runs on port 8787 (Cloudflare Workers default)
- Frontend runs on port 3000 with proxy to worker
- Pricing is runtime-configurable via KV (`config:base_cost_usdc`, `config:markup_percent`)
- Nonce-based replay attack prevention (24h TTL in KV)
- Payment tokens valid for 1 hour
- Sample prompts are auto-seeded in local dev mode
