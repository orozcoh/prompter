/**
 * Local development server without Cloudflare
 * Uses in-memory storage instead of KV/R2
 */

import { serve } from 'bun';
import app from './index';

// In-memory KV mock
class MemoryKV implements KVNamespace {
  private store = new Map<string, string>();

  async get(key: string, type?: 'json'): Promise<any> {
    const value = this.store.get(key);
    if (value === undefined) return null;
    if (type === 'json') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<{ keys: { name: string }[] }> {
    return {
      keys: Array.from(this.store.keys()).map(name => ({ name })),
    };
  }

  // Stub methods for full KVNamespace interface
  async getWithMetadata() { return { value: null }; }
  async listStream() { return new ReadableStream(); }
}

// In-memory R2 mock
class MemoryR2 implements R2Bucket {
  private store = new Map<string, R2Object & { data: ArrayBuffer }>();

  async get(key: string): Promise<R2ObjectBody | null> {
    const item = this.store.get(key);
    if (!item) return null;
    return {
      key: item.key,
      version: item.version,
      size: item.size,
      uploaded: item.uploaded,
      httpMetadata: item.httpMetadata,
      customMetadata: item.customMetadata,
      range: undefined,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(item.data));
          controller.close();
        }
      }),
      bodyUsed: false,
    };
  }

  async put(key: string, value: ArrayBuffer): Promise<R2Object> {
    const obj: R2Object & { data: ArrayBuffer } = {
      key,
      version: '1',
      size: value.byteLength,
      uploaded: new Date(),
      httpMetadata: {},
      customMetadata: {},
      data: value,
    };
    this.store.set(key, obj);
    return obj;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async head(key: string): Promise<R2Object | null> {
    return this.store.get(key) || null;
  }

  async list(): Promise<R2Objects> {
    return {
      objects: Array.from(this.store.values()).map(({ data, ...obj }) => obj),
      truncated: false,
    };
  }

  // Stub methods
  createMultipartUpload() { throw new Error('Not implemented'); }
  resumeMultipartUpload() { throw new Error('Not implemented'); }
}

// Seed some sample prompts
const seedPrompts = async (kv: MemoryKV) => {
  await kv.put('prompt-1', JSON.stringify({
    name: 'Cyberpunk Portrait',
    prompt: 'Transform into a cyberpunk character with neon lights and futuristic implants',
    category: 'front-face',
    imageUrl: 'https://picsum.photos/seed/cyberpunk/400/400',
  }));

  await kv.put('prompt-2', JSON.stringify({
    name: 'Fantasy Warrior',
    prompt: 'Transform into a medieval fantasy warrior in full armor',
    category: 'full-body',
    imageUrl: 'https://picsum.photos/seed/warrior/400/400',
  }));

  await kv.put('prompt-3', JSON.stringify({
    name: 'Anime Style',
    prompt: 'Transform into an anime character with big expressive eyes',
    category: 'front-face',
    imageUrl: 'https://picsum.photos/seed/anime/400/400',
  }));

    await kv.put('prompt-4', JSON.stringify({
    name: 'Carved Portrait',
    prompt: 'Convert the reference subject into an engraved contour line illustration drawn with dense black ink lines. Shading created only with curved line density like traditional etching. Background is warm beige handmade rice paper with subtle fiber texture. Monochrome black ink on rice paper aesthetic.',
    category: 'front-face',
    imageUrl: 'https://picsum.photos/seed/anime/400/400',
  }));
};

// Create mock environment
const env = {
  PROMPTS_KV: new MemoryKV(),
  IMAGES_R2: new MemoryR2(),
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || 'test-key',
  GENERATION_MODEL: process.env.GENERATION_MODEL || 'sourceful/riverflow-v2-fast-preview',
  X402_PRICE_USD: process.env.X402_PRICE_USD || '0.001',
  X402_PAY_TO_ADDRESS: process.env.X402_PAY_TO_ADDRESS || '0x7B3193eEb2d754d126b70A1F184659D52740D306',
  LOCAL_DEV_BYPASS_PAYMENT: process.env.LOCAL_DEV_BYPASS_PAYMENT || 'true',
  BASE_RPC_URL: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  MIN_CONFIRMATIONS: process.env.MIN_CONFIRMATIONS || '3',
};

// Seed sample data
await seedPrompts(env.PROMPTS_KV as MemoryKV);

// Start server
const server = serve({
  port: 8787,
  fetch: (req) => app.fetch(req, env),
});

console.log(`🚀 Local dev server running at http://localhost:${server.port}`);
console.log(`📋 Test endpoints:`);
console.log(`   - GET  http://localhost:${server.port}/health`);
console.log(`   - GET  http://localhost:${server.port}/prompts`);
console.log(`   - POST http://localhost:${server.port}/generate`);
console.log(`\n💡 Config from .env:`);
console.log(`   - GENERATION_MODEL: ${process.env.GENERATION_MODEL || 'sourceful/riverflow-v2-fast-preview'}`);
console.log(`   - X402_PAY_TO_ADDRESS: ${env.X402_PAY_TO_ADDRESS}`);
console.log(`   - X402_PRICE_USD: ${env.X402_PRICE_USD}`);
console.log(`   - BASE_RPC_URL: ${env.BASE_RPC_URL}`);
console.log(`   - MIN_CONFIRMATIONS: ${env.MIN_CONFIRMATIONS}`);
console.log(`   - LOCAL_DEV_BYPASS_PAYMENT: ${env.LOCAL_DEV_BYPASS_PAYMENT}${env.LOCAL_DEV_BYPASS_PAYMENT === 'true' ? ' (payment validation bypassed)' : ' (payment validation ENABLED)'}`);
console.log(`\n🔐 To enable real payments:`);
console.log(`   1. Set LOCAL_DEV_BYPASS_PAYMENT=false`);
console.log(`   2. Users pay USDC directly to X402_PAY_TO_ADDRESS`);
console.log(`   3. Worker verifies payments on-chain via Base RPC`);
