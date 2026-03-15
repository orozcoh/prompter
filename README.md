# Prompter

Free AI image generation platform. Upload a reference image, select a prompt style, and generate transformed images with AI.

## Features

- Upload reference images (front face, full body, or others)
- Browse prompt catalog with preview images
- AI image generation via OpenRouter
- Auto-download generated images

## Tech Stack

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| Vite + React + TypeScript | Frontend | [vite.dev](https://vite.dev/) · [react.dev](https://react.dev/) |
| Cloudflare Workers | Serverless backend | [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/) |
| Hono | Web framework | [hono.dev](https://hono.dev/docs/) |
| Cloudflare KV | Prompt storage | [developers.cloudflare.com/kv](https://developers.cloudflare.com/kv/) |
| Cloudflare R2 | Reference image storage | [developers.cloudflare.com/r2](https://developers.cloudflare.com/r2/) |
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
Enter each secret after ```wrangler secret put ....```

```bash
# OpenRouter API key for image generation
wrangler secret put OPENROUTER_API_KEY

# Price per generation in USD
wrangler secret put GENERATION_PRICE_USD

# AI model override (optional)
wrangler secret put GENERATION_MODEL

# Wallet address for payments
wrangler secret put RECEIVER_WALLET_ADDRESS
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
