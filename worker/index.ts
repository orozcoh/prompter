import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handlePayment, verifyPayment, getPaymentAmount } from './x402';

export type Env = {
  PROMPTS_KV: KVNamespace;
  IMAGES_R2: R2Bucket;
  OPENROUTER_API_KEY: string;
  GENERATION_MODEL?: string;
};

export type Variables = {
  paymentVerified: boolean;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS for frontend access
app.use('*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Get all prompts from KV
app.get('/prompts', async (c) => {
  const keys = await c.env.PROMPTS_KV.list();
  const prompts = [];

  for (const key of keys.keys) {
    const prompt = await c.env.PROMPTS_KV.get(key.name, 'json');
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
  const prompt = await c.env.PROMPTS_KV.get(id, 'json');

  if (!prompt) {
    return c.json({ error: 'Prompt not found' }, 404);
  }

  return c.json({ id, ...prompt });
});

// Generate image - requires x402 payment
app.post('/generate', async (c) => {
  // Verify payment first
  const paymentHeader = c.req.header('x-authorization');
  if (!paymentHeader || !paymentHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Payment required' }, 402);
  }

  const paymentToken = paymentHeader.slice(7);
  const paymentValid = await verifyPayment(paymentToken, c.env);

  if (!paymentValid) {
    return c.json({ error: 'Invalid or insufficient payment' }, 402);
  }

  try {
    const body = await c.req.json();
    const { promptId, referenceImage } = body;

    if (!promptId) {
      return c.json({ error: 'Prompt ID required' }, 400);
    }

    // Get the actual prompt from KV
    const promptData = await c.env.PROMPTS_KV.get(promptId, 'json');
    if (!promptData) {
      return c.json({ error: 'Prompt not found' }, 404);
    }

    const actualPrompt = promptData.prompt;

    // Call OpenRouter API
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

    const result = await openrouterResponse.json() as {
      choices?: [{
        message?: {
          content?: string | Array<{
            type?: string;
            image_url?: { url?: string } | string;
            text?: string;
            data?: string;
            part?: { inlineData?: { mimeType?: string; data?: string } };
          }>;
          image_url?: { url?: string } | string;
          parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }>;
        };
      }];
    };
    console.log('OpenRouter response:', JSON.stringify(result, null, 2));

    // Extract image from response - Gemini returns images in different formats
    let imageUrl: string | undefined;

    // Format 1: content as string (URL or data:image)
    if (result.choices?.[0]?.message?.content) {
      const content = result.choices[0].message.content;
      if (typeof content === 'string') {
        if (content.startsWith('http') || content.startsWith('data:image')) {
          imageUrl = content;
        }
      } else if (Array.isArray(content)) {
        // Format 2: content as array of parts
        for (const part of content) {
          // Format 2a: image_url as string
          if (typeof part.image_url === 'string') {
            imageUrl = part.image_url;
            break;
          }
          // Format 2b: image_url as object
          if (part.image_url && typeof part.image_url === 'object' && 'url' in part.image_url) {
            imageUrl = (part.image_url as { url?: string }).url;
            break;
          }
          // Format 2c: Gemini direct base64 data (type: "image", data: "base64string")
          if (part.type === 'image' && part.data) {
            imageUrl = `data:image/png;base64,${part.data}`;
            break;
          }
          // Format 2d: Gemini inlineData nested
          if (part.part?.inlineData?.data) {
            const mimeType = part.part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mimeType};base64,${part.part.inlineData.data}`;
            break;
          }
        }
      }
    }

    // Format 3: direct image_url in message
    if (!imageUrl && result.choices?.[0]?.message?.image_url) {
      const msgImageUrl = result.choices[0].message.image_url;
      imageUrl = typeof msgImageUrl === 'string' ? msgImageUrl : msgImageUrl?.url;
    }

    // Format 4: Gemini parts array with inlineData
    if (!imageUrl && result.choices?.[0]?.message?.parts) {
      const parts = result.choices[0].message.parts;
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      console.error('No image URL found in response. Full response:', JSON.stringify(result, null, 2));
      return c.json({ error: 'No image generated - API returned unexpected response format' }, 500);
    }

    return c.json({
      success: true,
      imageUrl,
      promptId,
    });
  } catch (error) {
    return c.json({ error: `Generation failed: ${error}` }, 500);
  }
});

// x402 payment endpoint
app.post('/x402/pay', handlePayment);

// Get current pricing config
app.get('/pricing', async (c) => {
  const baseCost = await c.env.PROMPTS_KV.get('config:base_cost_usdc') || '500000';
  const markupPercent = await c.env.PROMPTS_KV.get('config:markup_percent') || '100';
  const finalPrice = await getPaymentAmount(c.env, 1);

  return c.json({
    baseCostUsdc: baseCost,
    markupPercent: markupPercent,
    finalPriceUsdc: finalPrice,
  });
});

export default app;
