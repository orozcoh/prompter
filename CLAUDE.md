# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Free AI image generation platform. Users upload a reference image, select a prompt style from a catalog, and receive an AI-generated image. No payment required.

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Cloudflare Workers with Hono
- **Storage**: Cloudflare KV (prompts), Cloudflare R2 (catalog images)
- **AI**: OpenRouter API (google/gemini-2.5-flash-image-preview model)
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
│   └── dev.ts        # Local dev server with in-memory KV/R2 mocks
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ImageUpload.tsx
│       │   ├── PromptGallery.tsx
│       │   └── StatusIndicator.tsx
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
| `/generate` | POST | Generate image from prompt and reference image |

### Data Flow

1. Frontend fetches prompts from `/prompts`
2. User uploads reference image (base64, not stored)
3. User clicks a prompt style → triggers generation
4. Frontend calls `/generate` with prompt ID + reference image
5. Worker calls OpenRouter API
6. Generated image returned and auto-downloaded

### Environment Variables (wrangler.toml)

- `OPENROUTER_API_KEY` - OpenRouter API key
- `PROMPTS_KV` - KV namespace binding for prompts
- `IMAGES_R2` - R2 bucket binding for catalog images
- `GENERATION_MODEL` - Optional: override the AI model (default: google/gemini-2.5-flash-image-preview)

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
- Sample prompts are auto-seeded in local dev mode
