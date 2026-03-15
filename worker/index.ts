/// <reference types="@cloudflare/workers-types" />

import { Hono } from 'hono';
import { cors } from 'hono/cors';

export type Env = {
  PROMPTS_KV: KVNamespace;
  OPENROUTER_API_KEY: string;
  GENERATION_MODEL?: string;
};

interface PromptData {
  name: string;
  prompt: string;
  category?: string;
  imageUrl: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS for frontend access
app.use('*', cors());

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

// Generate image - no payment required
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
