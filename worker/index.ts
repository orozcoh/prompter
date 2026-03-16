/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { paymentMiddleware, x402ResourceServer } from '@x402/hono';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { HTTPFacilitatorClient } from '@x402/core/server';

export type Env = {
  PROMPTS_KV: KVNamespace;
  OPENROUTER_API_KEY: string;
  GENERATION_MODEL?: string;
  X402_PRICE_USD: string;
  X402_PAY_TO_ADDRESS: string;
  X402_FACILITATOR_URL?: string;
  LOCAL_DEV_BYPASS_PAYMENT?: string;
};

interface PromptData {
  name: string;
  prompt: string;
  category?: string;
  imageUrl: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS for frontend access - expose PAYMENT-REQUIRED header for x402
app.use('*', cors({
  origin: '*',
  exposeHeaders: ['PAYMENT-REQUIRED', 'x402-payment-required'],
}));

// x402 payment middleware setup
let cachedMiddleware: ReturnType<typeof paymentMiddleware> | undefined;
let cachedFacilitatorClient: HTTPFacilitatorClient | undefined;

app.use('*', async (c, next) => {
  // Skip payment middleware for health checks and prompts
  if (c.req.path.startsWith('/health') || c.req.path.startsWith('/prompts')) {
    return next();
  }

  // For /generate endpoint in local dev with bypass enabled, skip payment validation
  if (c.env.LOCAL_DEV_BYPASS_PAYMENT === 'true' && c.req.path === '/generate') {
    console.log('[worker] Local dev mode - bypassing payment validation');
    return next();
  }

  try {
    // Initialize facilitator client - use external HTTP facilitator
    if (!cachedFacilitatorClient) {
      const facilitatorUrl = c.env.X402_FACILITATOR_URL || 'https://v2.facilitator.mogami.tech';
      console.log('[worker] Using external facilitator:', facilitatorUrl);
      cachedFacilitatorClient = new HTTPFacilitatorClient({
        url: facilitatorUrl,
      });
    }

    // Initialize middleware
    if (!cachedMiddleware) {
      cachedMiddleware = paymentMiddleware(
        {
          "POST /generate": {
            accepts: [
              {
                scheme: "exact",
                price: `$${c.env.X402_PRICE_USD}`,
                network: "eip155:8453", // Base Mainnet
                payTo: c.env.X402_PAY_TO_ADDRESS,
                extra: {
                  // EIP-3009 transferWithAuthorization requires EIP-712 domain parameters
                  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
                  name: "USD Coin",
                  version: "2", // USDC contract version
                },
              },
            ],
            description: "AI image generation",
            mimeType: "application/json",
          },
        },
        new x402ResourceServer(cachedFacilitatorClient)
          .register("eip155:8453", new ExactEvmScheme())
      );
      console.log('[worker] Payment middleware initialized successfully');
    }
  } catch (error) {
    console.error('[worker] Payment middleware initialization error:', error);
    // If payment setup fails, continue without payment enforcement
    // This prevents complete failure but logs the issue
  }
  return cachedMiddleware ? cachedMiddleware(c, next) : next();
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Get all prompts from KV
app.get('/prompts', async (c) => {
  const keys = await c.env.PROMPTS_KV.list();
  const prompts: Array<{ id: string } & PromptData> = [];

  for (const key of keys.keys) {
    const prompt = await c.env.PROMPTS_KV.get(key.name, 'json') as PromptData | null;
    if (prompt) {
      prompts.push({
        id: key.name,
        ...prompt,
      });
    }
  }

  return c.json({ prompts });
});

// Get single prompt by ID
app.get('/prompts/:id', async (c) => {
  const id = c.req.param('id');
  const prompt = await c.env.PROMPTS_KV.get(id, 'json') as PromptData | null;

  if (!prompt) {
    return c.json({ error: 'Prompt not found' }, 404);
  }

  return c.json({ id, ...prompt });
});

// Generate image - x402 payment required
app.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { promptId, referenceImage } = body;

    if (!promptId) {
      return c.json({ error: 'Prompt ID required' }, 400);
    }

    // Get the actual prompt from KV
    const promptData = await c.env.PROMPTS_KV.get(promptId, 'json') as PromptData | null;
    if (!promptData) {
      return c.json({ error: 'Prompt not found' }, 404);
    }

    const actualPrompt = promptData.prompt;

    // Call OpenRouter API for image generation
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: c.env.GENERATION_MODEL || 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: actualPrompt },
              ...(referenceImage ? [{ type: 'image_url', image_url: { url: referenceImage } }] : []),
            ],
          },
        ],
      }),
    });

    if (!openrouterResponse.ok) {
      const error = await openrouterResponse.text();
      console.error('OpenRouter error:', error);
      return c.json({ error: `OpenRouter API error: ${error}` }, 500);
    }

    const result = await openrouterResponse.json();

    // Return full API response to client for processing
    return c.json({
      success: true,
      promptId,
      apiResponse: result,
    });
  } catch (error) {
    return c.json({ error: `Generation failed: ${error}` }, 500);
  }
});

export default app;
