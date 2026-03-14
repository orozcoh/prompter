# Prompter

Pay-per-prompt AI image generation platform using x402 protocol for crypto payments.

## Features

- Upload reference images (front face, full body, or others)
- Browse prompt catalog with preview images
- Pay with USDC on Base network via x402 protocol
- AI image generation via OpenRouter (nano-banana-pro)
- Auto-download generated images

## Tech Stack

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| Vite + React + TypeScript | Frontend | [vite.dev](https://vite.dev/) · [react.dev](https://react.dev/) |
| Cloudflare Workers | Serverless backend | [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/) |
| Hono | Web framework | [hono.dev](https://hono.dev/docs/) |
| Cloudflare KV | Prompt storage | [developers.cloudflare.com/kv](https://developers.cloudflare.com/kv/) |
| Cloudflare R2 | Image storage | [developers.cloudflare.com/r2](https://developers.cloudflare.com/r2/) |
| x402 Protocol | Crypto payments | [x402.org](https://x402.org/) · [coinbase mti docs](https://github.com/coinbase/mcp) |
| USDC on Base | Payment token | [base.org](https://base.org/) · [circle.com/usdc](https://www.circle.com/en/usdc) |
| OpenRouter | AI image generation | [openrouter.ai/docs](https://openrouter.ai/docs) |
| Bun | Runtime & package manager | [bun.com](https://bun.com/docs) |

## Quick Start

### Option 1: Local Development (No Cloudflare Required)

```bash
# Install dependencies
bun install

# Start local dev server with mocked KV/R2
bun run dev:local

# In another terminal, start frontend
cd frontend && bun dev
```

This runs the worker with in-memory storage (no Cloudflare account needed). Sample prompts are auto-seeded.

### Option 2: With Cloudflare Workers

```bash
# Start development server
bun run dev

# In another terminal, start frontend
cd frontend && bun dev
```

## Requirements

- Bun (https://bun.com)
- Cloudflare account (for Workers, KV, R2)
- OpenRouter API key
- Web3 wallet (MetaMask, etc.) for payments

## Setup & Configuration

### 1. Create Cloudflare Resources

```bash
# Create KV namespace for prompts
wrangler kv namespace create PROMPTS_KV

# Create R2 bucket for catalog images
wrangler r2 bucket create prompter-images
```

### 2. Configure wrangler.toml

Update the IDs in `wrangler.toml` with the output from the commands above:

```toml
[[kv_namespaces]]
binding = "PROMPTS_KV"
id = "<your-kv-namespace-id>"

[[r2_buckets]]
binding = "IMAGES_R2"
bucket_name = "prompter-images"
```

### 3. Set Secrets

```bash
# OpenRouter API key for image generation
wrangler secret put OPENROUTER_API_KEY
```

### 4. Seed Prompt Catalog (Optional)

Add prompts to KV:

```bash
# Example: Add a prompt via wrangler
wrangler kv key put PROMPTS_KV "prompt-1" --value '{
  "name": "Cyberpunk Portrait",
  "prompt": "Transform into a cyberpunk character with neon lights",
  "category": "front-face"
}'
```

### 5. Upload Catalog Images to R2

Place your prompt preview images in the R2 bucket:

```bash
wrangler r2 object put prompter-images/prompt-1.jpg --file=./path/to/image.jpg
```

### 6. Configure Pricing (Runtime Configurable)

Set the base cost and markup percentage in KV. These can be adjusted anytime without redeploying:

```bash
# Set base cost in USDC (6 decimals, e.g., 500000 = 0.50 USDC)
wrangler kv key put PROMPTS_KV "config:base_cost_usdc" --value "500000"

# Set markup percentage (e.g., 100 = 100% markup = 2x base price)
wrangler kv key put PROMPTS_KV "config:markup_percent" --value "100"
```

**Examples:**
| Base Cost | Markup | Final Price | Command |
|-----------|--------|-------------|---------|
| 0.5 USDC | 100% | 1.0 USDC | `base_cost_usdc=500000`, `markup_percent=100` |
| 1.0 USDC | 50% | 1.5 USDC | `base_cost_usdc=1000000`, `markup_percent=50` |
| 1.0 USDC | 100% | 2.0 USDC | `base_cost_usdc=1000000`, `markup_percent=100` |

To view current pricing config:
```bash
curl http://localhost:8787/pricing
```

## Development

### Local (No Cloudflare)

```bash
# Start worker with in-memory KV/R2 (port 8787)
bun run dev:local

# In another terminal, start frontend (port 3000)
cd frontend && bun dev
```

### With Cloudflare Workers

```bash
# Start worker (port 8787)
bun run dev

# In another terminal, start frontend (port 3000)
cd frontend && bun dev
```

## Deployment

```bash
# Build and deploy
bun run deploy
```
