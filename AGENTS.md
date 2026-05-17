# AGENTS.md

This file provides OpenCode-specific guidance for working in this repository.

## Runtime: Bun (not Node)

- `bun install` / `bun run <script>` / `bunx <tool>`
- Bun auto-loads `.env` files — no dotenv needed

## Two-Package Structure

Root is the Cloudflare Worker (`worker/index.ts`). `frontend/` is a separate Vite + React project with its own `package.json`.

```bash
bun run dev:local      # Worker on port 8787 (in-memory KV/R2, no Cloudflare)
cd frontend && bun dev  # Vite on port 3000 (separate terminal)
bun run lint            # ESLint on frontend only (there are no tests)
```

## KV Key Pattern

Prompt keys in KV are `prompt-{prompt-id}` (e.g. `prompt-any-001`), not the raw ID. The `prompts.json` seed file uses a `prompt-id` field.

`prompts.json` is in `.gitignore`. Copy from `prompts.example.json` to get started.

## Frontend Proxy

In dev, Vite proxies `/api/*` → `http://localhost:8787/*`. Frontend code calls `/api/generate`, Vite strips the `/api` prefix. In production, you need a reverse proxy or separate URL config.

## TypeScript: `verbatimModuleSyntax`

The root `tsconfig.json` sets `verbatimModuleSyntax: true`. Use `import type { Foo }` for type-only imports. Plain `import { Foo }` where `Foo` is only used as a type will error.

## Payment Bypass (dev)

`LOCAL_DEV_BYPASS_PAYMENT=true` (default) skips on-chain verification. Set to `false` to test real x402 payments.

USDC conversion: the code multiplies the USD price by `1e6` (USDC has 6 decimals). A price of `"0.05"` → `50000` raw amount.

## Build

```bash
bun run build              # frontend (tsc + vite build) then worker dry-run
bun run build:frontend      # tsc -b && vite build (typecheck first)
bun run deploy              # wrangler deploy
```

## Vite Node Polyfills

Frontend uses `viem` + `@walletconnect` which need Node polyfills. `vite-plugin-node-polyfills` handles this in `vite.config.ts`. Don't remove it.

## Skills

Installed skills are tracked in `skills-lock.json`, stored in `.agents/skills/`. The `frontend-design` and `ui-ux-pro-max` skills are available for UI work.

## Secrets

- `OPENROUTER_API_KEY` — set via `wrangler secret put` or `.env` for local dev
- \`GENERATION_LOW_MODEL\` — optional override for the low-tier AI model
- \`GENERATION_HIGH_MODEL\` — optional override for the high-tier AI model

## DESIGN.md

When modifying UI, follow `DESIGN.md` — dark-only OLED theme, 4.5:1 contrast minimum, no light mode.
