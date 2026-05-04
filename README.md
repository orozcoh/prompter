# Prompter

> Transform your images with AI. Pay-per-use with crypto, no subscription required.

[![Built with](https://img.shields.io/badge/built%20with-Cloudflare%20Workers-blue)](https://workers.cloudflare.com)
[![Powered by](https://img.shields.io/badge/powered%20by-OpenRouter-orange)](https://openrouter.ai)
[![x402 enabled](https://img.shields.io/badge/x402-enabled-green)](https://x402.org)

Prompter is an AI image generation platform that lets you transform reference images using curated prompt styles. Built on Cloudflare Workers with x402 protocol for trustless, pay-per-use payments.

---

## ✨ Features

- 📸 **Reference Image Upload** — Drag-and-drop support for front face, full body, or any image
- 🎨 **Prompt Catalog** — Browse curated styles with live preview images
- 🤖 **AI Generation** — Powered by OpenRouter (sourceful/riverflow-v2-fast-preview)
- 💰 **x402 Payments** — Pay only when you generate with on-chain USDC on Base
- ⚡ **Auto-Download** — Generated images download automatically

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vite + React 19 + TypeScript |
| **Backend** | Cloudflare Workers + Hono |
| **Storage** | Cloudflare KV (prompts) + R2 (images - planned) |
| **AI** | OpenRouter API |
| **Payments** | x402 protocol + USDC on Base |
| **Runtime** | Bun |

---

## 🚀 Quick Start

### Local Development (No Cloudflare Required)

```bash
# Clone and install
git clone https://github.com/your-org/prompter.git
cd prompter
bun install

# Start local worker (in-memory KV/R2, auto-seeded)
bun run dev:local

# Start frontend (new terminal)
cd frontend && bun dev
```

Visit `http://localhost:3000` to start generating images.

---

## 📋 Requirements

- [Bun](https://bun.com) (v1.x+)
- Cloudflare account (for deployment)
- OpenRouter API key (for AI generation)

---

## 🛠️ Setup & Configuration

### 1. Create Cloudflare Resources

```bash
# KV namespace for prompts
wrangler kv namespace create PROMPTS_KV

# R2 bucket for catalog images
wrangler r2 bucket create prompter-images
```

### 2. Configure wrangler.toml

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
# OpenRouter API key (required)
wrangler secret put OPENROUTER_API_KEY

# AI model override (optional)
wrangler secret put GENERATION_MODEL
```

---

## 💳 x402 Payment Setup

By default, payment validation is bypassed (`LOCAL_DEV_BYPASS_PAYMENT=true`). To enable real payments:

### Enable Payments

1. **Set environment variable** in `.env`:
   ```env
   LOCAL_DEV_BYPASS_PAYMENT=false
   ```

2. **Configure payment settings** (optional - defaults provided):
   ```env
   X402_PRICE_USD=0.10
   X402_PAY_TO_ADDRESS=0xYourUsdcRecipientAddress
   BASE_RPC_URL=https://mainnet.base.org
   MIN_CONFIRMATIONS=3
   ```

### How It Works

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│  /generate   │────▶│  x402 402    │────▶│   Wallet    │
│   (React)   │     │   (Hono)     │     │   Response   │     │   Sign USDC │
└─────────────┘     └──────────────┘     └──────────────┘     └─────────────┘
                                                                    │
┌─────────────┐     ┌──────────────┐     ┌──────────────┐          │
│   Download  │◀────│  OpenRouter  │◀────│  /verify-    │◀─────────┘
│   Image     │     │   API Call   │     │   payment    │  (tx hash)
└─────────────┘     └──────────────┘     └──────────────┘
```

**Payment flow:**
1. User clicks generate → `/generate` returns HTTP 402 with x402 payment details
2. Frontend prompts user to send USDC directly to `X402_PAY_TO_ADDRESS`
3. User signs USDC transfer transaction via their wallet (MetaMask, WalletConnect, etc.)
4. Frontend submits tx hash to `/verify-payment`
5. Worker verifies payment on-chain via Base RPC (checks confirmations, amount, recipient)
6. On success, worker calls OpenRouter API and returns generated image
7. Tx hash is stored in KV to prevent replay attacks

**No facilitator needed** - users pay USDC directly to your address, and the worker verifies transactions on-chain.

---

## 📦 Seed Data

### KV Data Structure
Prompts are stored with keys following this pattern: `prompt-{prompt-id}`
Example: `prompt-any-001`, `prompt-any-002`, etc.

Each value is a JSON object:
```json
{
  "name": "Prompt Name",
  "prompt": "AI prompt text",
  "category": "category",
  "imageUrl": "/path/to/image.png"
}
```

### Bulk Population
To populate the production KV from `prompts.json`, use the provided population script:
```bash
bun run scripts/populate-kv.ts
```
*Note: The script uses `wrangler kv key put --remote` to ensure data is uploaded to the production environment.*

### Manual Entry (Single Prompt)
```bash
wrangler kv key put PROMPTS_KV "prompt-1" --value '{
  "name": "Cyberpunk Portrait",
  "prompt": "Transform into a cyberpunk character with neon lights and futuristic implants",
  "category": "front-face"
}'
```

### Upload Catalog Images to R2

```bash
wrangler r2 object put prompter-images/prompt-1.jpg --file=./path/to/image.jpg
```

---

## 🌍 Deployment

Prompter uses a **split deployment** model: the backend is a Cloudflare Worker (API only), and the frontend is a separate Cloudflare Pages project.

### Architecture

```
Browser ──▶ prompter-frontend.pages.dev (static SPA)
                │
                ▼ API calls (VITE_API_URL)
            prompter-worker.digitalerror.xyz (Worker: /prompts, /generate, /verify-payment)
```

### Deploy the Worker (API)

```bash
# One-time: create KV namespace and R2 bucket (see Setup section)
wrangler kv namespace create PROMPTS_KV
wrangler r2 bucket create prompter-images

# Set secrets (one-time)
wrangler secret put OPENROUTER_API_KEY

# Deploy
bun run deploy
```

### Deploy the Frontend (Pages)

```bash
# One-time: create the Pages project
wrangler pages project create prompter-frontend

# Build and deploy (repeat on every update)
bun run deploy:frontend
```

The `_redirects` file (`/* /index.html 200`) handles SPA client-side routing so `/about`, `/myImages`, etc. work without 404s.

### Set the Frontend API URL

Before deploying, configure the Worker URL in `frontend/.env.production`:

```env
VITE_API_URL=https://prompter-worker.digitalerror.xyz
```

### All-in-One (first time)

```bash
# 1. Create Pages project
wrangler pages project create prompter-frontend

# 2. Deploy Worker
bun run deploy

# 3. Deploy Frontend
bun run deploy:frontend
```

---

## 📂 Project Structure

```
prompter/
├── worker/
│   ├── index.ts            # Hono API routes
│   ├── dev.ts              # Local dev server (mocked KV/R2)
│   └── utils/
│       └── verifyPayment.ts # On-chain payment verification
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── PromptGallery.tsx
│   │   │   ├── StatusIndicator.tsx
│   │   │   ├── PaywallModal.tsx
│   │   │   └── WalletSelectionModal.tsx
│   │   ├── hooks/
│   │   │   └── useX402Payment.ts
│   │   ├── utils/
│   │   │   ├── extractImageUrl.ts
│   │   │   └── walletConnect.ts
│   │   └── App.tsx
│   └── vite.config.ts
├── wrangler.toml
├── package.json
└── CLAUDE.md
```

---

## 📜 License

MIT
