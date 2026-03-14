import { Context } from 'hono';
import type { Env } from './index';

/**
 * x402 Payment Protocol Implementation
 * Handles USDC payments on Base network for pay-per-prompt image generation
 */

interface PaymentPayload {
  amount: string;
  token: string; // USDC contract address
  chainId: number; // Base = 8453
  payer: string;
  signature: string;
  nonce: string;
}

interface PaymentRecord {
  id: string;
  amount: string;
  payer: string;
  timestamp: number;
  verified: boolean;
}

// In-memory cache for verified payments (in production, use KV)
const paymentCache = new Map<string, PaymentRecord>();

/**
 * Handle x402 payment request
 * Client sends payment proof, server verifies and returns access token
 */
export async function handlePayment(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json<PaymentPayload>();
    const { amount, token, chainId, payer, signature, nonce } = body;

    // Verify chain is Base
    if (chainId !== 8453) {
      return c.json({ error: 'Only Base network (chainId 8453) is supported' }, 400);
    }

    // Verify token is USDC on Base
    const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    if (token.toLowerCase() !== USDC_BASE.toLowerCase()) {
      return c.json({ error: 'Only USDC on Base is accepted' }, 400);
    }

    // Verify signature (simplified - in production, verify against nonce service)
    const isValid = await verifySignature(payer, nonce, signature);
    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Check if nonce already used (prevent replay attacks)
    const nonceKey = `nonce:${payer}:${nonce}`;
    const existingNonce = await c.env.PROMPTS_KV.get(nonceKey);
    if (existingNonce) {
      return c.json({ error: 'Nonce already used' }, 400);
    }

    // Store nonce to prevent reuse (TTL: 24 hours)
    await c.env.PROMPTS_KV.put(nonceKey, 'used', { expirationTtl: 86400 });

    // Generate payment token for this transaction
    const paymentToken = crypto.randomUUID();

    // Cache the payment
    paymentCache.set(paymentToken, {
      id: paymentToken,
      amount,
      payer,
      timestamp: Date.now(),
      verified: true,
    });

    return c.json({
      success: true,
      paymentToken,
      amount,
    });
  } catch (error) {
    return c.json({ error: `Payment processing failed: ${error}` }, 500);
  }
}

/**
 * Verify payment token for accessing protected resources
 */
export async function verifyPayment(token: string, env: Env): Promise<boolean> {
  // Check cache first
  const cached = paymentCache.get(token);
  if (cached && cached.verified) {
    // Check if payment is still valid (1 hour window)
    if (Date.now() - cached.timestamp < 3600000) {
      return true;
    }
  }

  // Could verify against KV storage for persistent payments
  const stored = await env.PROMPTS_KV.get(`payment:${token}`);
  return stored !== null;
}

/**
 * Verify cryptographic signature from wallet
 * This is a simplified implementation - use proper SIWE or EIP-712 in production
 */
async function verifySignature(
  address: string,
  nonce: string,
  signature: string
): Promise<boolean> {
  // In production, use ethers.js or viem to verify the signature
  // This is a placeholder that validates signature format
  if (!signature.startsWith('0x') || signature.length !== 132) {
    return false;
  }

  if (!address.startsWith('0x') || address.length !== 42) {
    return false;
  }

  // TODO: Implement proper signature verification with ethers.js
  // const message = hashMessage(nonce);
  // const recoveredAddress = verifyMessage(message, signature);
  // return recoveredAddress.toLowerCase() === address.toLowerCase();

  return true; // Placeholder for development
}

/**
 * Get required payment amount for image generation
 * Reads base cost and markup percentage from KV for runtime configuration
 *
 * KV keys:
 * - config:base_cost_usdc - Base cost in USDC (6 decimals, e.g., "500000" = 0.5 USDC)
 * - config:markup_percent - Markup percentage (e.g., "100" = 100% markup = 2x price)
 */
export async function getPaymentAmount(env: Env, promptTier: number = 1): Promise<string> {
  // Read config from KV (with defaults if not set)
  const baseCost = await env.PROMPTS_KV.get('config:base_cost_usdc') || '500000'; // Default: 0.5 USDC
  const markupPercent = await env.PROMPTS_KV.get('config:markup_percent') || '100'; // Default: 100% (2x)

  // Calculate: base_cost * promptTier * (1 + markup_percent/100)
  const base = BigInt(baseCost);
  const multiplier = BigInt(100) + BigInt(markupPercent);
  const result = (base * BigInt(promptTier) * multiplier) / BigInt(100);

  return result.toString();
}
