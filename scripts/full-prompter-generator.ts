// scripts/full-prompter-generator.ts
//
// Bulk image generator using OpenRouter API.
// Edit the constants below, then run:
//   bun run scripts/full-prompter-generator.ts

// ═══ Configuration ═══
//const MODEL = "sourceful/riverflow-v2-fast";
const MODEL = "google/gemini-3.1-flash-image-preview";
const REFERENCE_IMAGE_PATH = "./frontend/public/prompt-sample/prompt-ref-low.jpg";
const OUTPUT_FOLDER = "high-any";
const PREFIX_NAME = "high_";
const PROMPTS_FILE_PATH = "./prompts_sample.json";
const DELAY_MS = 2000; // delay between requests to avoid rate limits
// ════════════════════

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, extname, join } from "node:path";
import sharp from "sharp";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY not set in environment (.env file)");
  process.exit(1);
}

interface PromptEntry {
  "prompt-id": string;
  name: string;
  category: string;
  prompt: string;
  imageUrl: string;
}

// --- Helpers ---

function imageFileToDataUrl(path: string): string {
  const data = readFileSync(path);
  const ext = extname(path).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  const mime = mimeMap[ext] || "image/png";
  const base64 = Buffer.from(data).toString("base64");
  return `data:${mime};base64,${base64}`;
}

function extractImageUrl(result: unknown): string | undefined {
  const msg = (result as any)?.choices?.[0]?.message;
  if (!msg) return undefined;

  // FORMAT 1: message.images array
  if (msg.images && Array.isArray(msg.images)) {
    for (const image of msg.images) {
      if (image.image_url?.url) return image.image_url.url;
    }
  }

  // FORMAT 2: content string
  if (typeof msg.content === "string") {
    const content = msg.content.trim();
    if (content.startsWith("http") || content.startsWith("data:image")) return content;
    if (/^[A-Za-z0-9+/=\n\r]+$/.test(content) && content.length > 1000) {
      return `data:image/png;base64,${content}`;
    }
  }

  // FORMAT 3: content array
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (typeof part.image_url === "string") return part.image_url;
      if (typeof part.image_url === "object" && part.image_url?.url) return part.image_url.url;
      if (part.type === "image" && part.data) return `data:image/png;base64,${part.data}`;
      if (part.part?.inlineData?.data) {
        const mime = part.part.inlineData.mimeType || "image/png";
        return `data:${mime};base64,${part.part.inlineData.data}`;
      }
      if (part.text) {
        const txt = part.text.trim();
        if (/^[A-Za-z0-9+/=\n\r]+$/.test(txt) && txt.length > 1000) {
          return `data:image/png;base64,${txt}`;
        }
      }
    }
  }

  // FORMAT 4: direct image_url
  if (msg.image_url) {
    return typeof msg.image_url === "string" ? msg.image_url : msg.image_url?.url;
  }

  // FORMAT 5: Gemini parts array
  if (msg.parts) {
    for (const part of msg.parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || "image/png";
        return `data:${mime};base64,${part.inlineData.data}`;
      }
      if (part.text) {
        const txt = part.text.trim();
        if (/^[A-Za-z0-9+/=\n\r]+$/.test(txt) && txt.length > 1000) {
          return `data:image/png;base64,${txt}`;
        }
      }
    }
  }

  return undefined;
}

async function saveImageFromUrl(url: string, filePath: string): Promise<void> {
  let raw: Buffer;

  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    if (!base64) throw new Error("Invalid data URL (no base64 content)");
    raw = Buffer.from(base64, "base64");
  } else {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed (HTTP ${response.status})`);
    raw = Buffer.from(await response.arrayBuffer());
  }

  const webp = await sharp(raw).webp({ quality: 90 }).toBuffer();
  writeFileSync(filePath, webp);
}

async function generateImage(
  entry: PromptEntry,
  referenceDataUrl: string,
): Promise<void> {
  const body = JSON.stringify({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: entry.prompt },
          { type: "image_url", image_url: { url: referenceDataUrl } },
        ],
      },
    ],
  });

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  const result = (await response.json()) as any;

  if (result.usage && typeof result.usage.cost === "number") {
    console.log(`     💰 cost: $${result.usage.cost}`);
  }

  const imageUrl = extractImageUrl(result);
  if (!imageUrl) {
    const snippet = JSON.stringify(result).slice(0, 500);
    throw new Error(`No image found in response. Snippet: ${snippet}`);
  }

  const baseName = `${PREFIX_NAME}${entry["prompt-id"]}.webp`;
  const filePath = resolve(join(OUTPUT_FOLDER, baseName));
  await saveImageFromUrl(imageUrl, filePath);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main ---

async function main() {
  // Load prompts
  const promptsPath = resolve(PROMPTS_FILE_PATH);
  let prompts: PromptEntry[];
  try {
    const raw = readFileSync(promptsPath, "utf-8");
    prompts = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to read prompts from: ${promptsPath}`);
    console.error(err);
    process.exit(1);
  }

  if (!Array.isArray(prompts) || prompts.length === 0) {
    console.error("❌ prompts.json is empty or not a valid array");
    process.exit(1);
  }

  console.log(`📋 Loaded ${prompts.length} prompts from ${PROMPTS_FILE_PATH}`);

  // Load reference image
  const refPath = resolve(REFERENCE_IMAGE_PATH);
  let referenceDataUrl: string;
  try {
    referenceDataUrl = imageFileToDataUrl(refPath);
    console.log(`🖼️  Reference image loaded: ${refPath}`);
  } catch (err) {
    console.error(`❌ Failed to read reference image: ${refPath}`);
    console.error(err);
    process.exit(1);
  }

  // Create output folder
  const outputDir = resolve(OUTPUT_FOLDER);
  mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Output folder: ${outputDir}/`);

  // Generate images
  console.log(`🚀 Starting generation with model: ${MODEL}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const [i, entry] of prompts.entries()) {
    const label = `[${i}/${prompts.length - 1}] ${entry.name} (${entry["prompt-id"]})`;
    console.log(`⏳ Generating ${label}...`);

    try {
      await generateImage(entry, referenceDataUrl);
      console.log(`✅ ${label}`);
      successCount++;
    } catch (err) {
      console.error(`❌ ${label}: ${(err as Error).message}`);
      failCount++;
    }

    // Delay between requests (skip delay after the last one)
    if (i < prompts.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n🎉 Done! ${successCount} succeeded, ${failCount} failed`);
  if (failCount > 0) process.exitCode = 1;
}

main();
