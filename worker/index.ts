/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { verifyPayment, type PaymentVerificationParams } from './utils/verifyPayment';

export type Env = {
  PROMPTS_KV: KVNamespace;
  OPENROUTER_API_KEY: string;
  GENERATION_MODEL?: string;
  X402_PRICE_USD: string;
  X402_PAY_TO_ADDRESS: string;
  LOCAL_DEV_BYPASS_PAYMENT?: string;
  BASE_RPC_URL?: string;
  MIN_CONFIRMATIONS?: string;
};

interface PromptData {
  name: string;
  prompt: string;
  category?: string;
  imageUrl: string;
}

interface VerifyPaymentRequest {
  txHash: string;
  promptId: string;
  referenceImage?: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS for frontend access - expose PAYMENT-REQUIRED header for x402
app.use('*', cors({
  origin: '*',
  exposeHeaders: ['PAYMENT-REQUIRED', 'x402-payment-required'],
}));

// Helper to generate x402 payment required data
function createPaymentRequiredData(priceUsd: string, payTo: string, resourceUrl: string) {
  const amountRaw = BigInt(Math.floor(parseFloat(priceUsd) * 1e6)); // USDC has 6 decimals

  return {
    x402Version: 2,
    error: 'Payment required',
    accepts: [
      {
        scheme: 'exact',
        network: 'eip155:8453' as const,
        amount: amountRaw.toString(),
        maxTimeoutSeconds: 300,
        payTo: payTo as `0x${string}`,
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
        extra: {
          asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          name: 'USD Coin',
          version: '2',
        },
      },
    ],
    resource: {
      url: resourceUrl,
      description: 'AI image generation',
      mimeType: 'application/json',
    },
  };
}

// Helper function to generate image using OpenRouter
async function generateImage(
  c: any,
  promptId: string,
  referenceImage?: string,
  paymentInfo?: { amount: string; confirmations: number; from: string; txHash: string }
) {
  // Get the prompt from KV
  const promptData = await c.env.PROMPTS_KV.get(promptId, 'json') as PromptData | null;
  if (!promptData) {
    return c.json({ error: 'Prompt not found' }, 404);
  }

  // Call OpenRouter API for image generation
  const actualPrompt = promptData.prompt;
  const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${c.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: c.env.GENERATION_MODEL || 'sourceful/riverflow-v2-fast-preview',
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
  const response: any = {
    success: true,
    promptId,
    apiResponse: result,
  };

  // Add payment info if provided (for verified payments)
  if (paymentInfo) {
    response.txHash = paymentInfo.txHash;
    response.paymentVerified = {
      amount: paymentInfo.amount,
      confirmations: paymentInfo.confirmations,
      from: paymentInfo.from,
    };
  }

  return c.json(response);
}

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Get all prompts from KV
app.get('/prompts', async (c) => {
  const keys = await c.env.PROMPTS_KV.list();
  const prompts: Array<Omit<PromptData, 'prompt' & { id: string }>> = [];

  for (const key of keys.keys) {
    const prompt = await c.env.PROMPTS_KV.get(key.name, 'json') as PromptData | null;
    if (prompt) {
      const { prompt: _, ...publicPrompt } = prompt;
      prompts.push({
        id: key.name,
        ...publicPrompt,
      } as any);
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

  const { prompt: _, ...publicPrompt } = prompt;
  return c.json({ id, ...publicPrompt });
});

// Generate image - returns payment info if no txHash provided
app.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { promptId, referenceImage, txHash } = body;

    // If txHash is provided, this is a payment verification request - reject with proper error
    if (txHash) {
      return c.json({
        error: 'Use /verify-payment endpoint for payment verification',
        hint: 'Send POST to /verify-payment with { txHash, promptId, referenceImage }'
      }, 400);
    }

    // Check if payment bypass is enabled (local dev only)
    const bypassPayment = c.env.LOCAL_DEV_BYPASS_PAYMENT === 'true';

    if (bypassPayment) {
      // Skip payment - generate directly
      return await generateImage(c, promptId, referenceImage);
    }

    // If no txHash, return payment required (402) with payment details
    const paymentData = createPaymentRequiredData(
      c.env.X402_PRICE_USD,
      c.env.X402_PAY_TO_ADDRESS,
      '/generate'
    );

    const encodedHeader = btoa(JSON.stringify(paymentData));

    return c.json(
      {
        error: 'Payment required',
        paymentData: paymentData,
      },
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'PAYMENT-REQUIRED': encodedHeader,
          'x402-payment-required': encodeURIComponent(JSON.stringify(paymentData)),
        },
      }
    );
  } catch (error) {
    return c.json({ error: `Request failed: ${error}` }, 500);
  }
});

// Verify payment and generate image
app.post('/verify-payment', async (c) => {
  try {
    const body = await c.req.json() as VerifyPaymentRequest;
    const { txHash, promptId, referenceImage } = body;

    // Log incoming transaction
    console.log(`tx: ${txHash}`);

    if (!txHash) {
      return c.json({ error: 'Transaction hash required' }, 400);
    }

    if (!promptId) {
      return c.json({ error: 'Prompt ID required' }, 400);
    }

    // Get the prompt from KV
    const promptData = await c.env.PROMPTS_KV.get(promptId, 'json') as PromptData | null;
    if (!promptData) {
      return c.json({ error: 'Prompt not found' }, 404);
    }

    // Check for replay attack - verify txHash hasn't been used before
    const replayKey = `processed_tx:${txHash}`;
    const alreadyProcessed = await c.env.PROMPTS_KV.get(replayKey);
    if (alreadyProcessed) {
      return c.json({
        error: 'Transaction already processed',
        hint: 'This transaction hash has already been used for payment'
      }, 400);
    }

    // Verify payment on-chain
    const verificationParams: PaymentVerificationParams = {
      txHash,
      expectedPayTo: c.env.X402_PAY_TO_ADDRESS,
      expectedAmountUsd: c.env.X402_PRICE_USD,
      minConfirmations: c.env.MIN_CONFIRMATIONS ? parseInt(c.env.MIN_CONFIRMATIONS) : 3,
    };

    const verification = await verifyPayment(
      txHash,
      verificationParams,
      c.env.BASE_RPC_URL
    );

    if (!verification.valid) {
      console.log(`rx: NOT VALID - ${verification.error}`);
      return c.json({
        error: 'Payment verification failed',
        reason: verification.error,
        txHash,
        confirmations: verification.confirmations || 0,
      }, verification.error?.includes('Insufficient confirmations') ? 425 : 400);
    }

    console.log(`rx: VALID - ${verification.amount} USDC, ${verification.confirmations} confirmations`);

    // Mark tx as processed to prevent replay
    await c.env.PROMPTS_KV.put(replayKey, JSON.stringify({
      promptId,
      timestamp: Date.now(),
      amount: verification.amount,
      from: verification.from,
    }));

    // Generate image using helper function with payment info
    console.log('     -> generating image...');
    const result = await generateImage(c, promptId, referenceImage, {
      txHash,
      amount: verification.amount || '0',
      confirmations: verification.confirmations || 0,
      from: verification.from || '',
    });
    return result;
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return c.json({ error: `Verification failed: ${error.message || error}` }, 500);
  }
});

export default app;
