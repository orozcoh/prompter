/**
 * Extract image URL from OpenRouter API response
 * Handles multiple formats from different models (Gemini, Flux, etc.)
 */
export function extractImageUrl(result: unknown): string | undefined {
  const msg = (result as any)?.choices?.[0]?.message;

  if (!msg) return undefined;

  // FORMAT 1: Official OpenRouter - message.images array
  if (msg.images && Array.isArray(msg.images)) {
    for (const image of msg.images) {
      if (image.image_url?.url) {
        return image.image_url.url;
      }
    }
  }

  // FORMAT 2: content string
  if (typeof msg.content === "string") {
    const content = msg.content.trim();

    if (content.startsWith("http") || content.startsWith("data:image")) {
      return content;
    }

    // raw base64
    if (/^[A-Za-z0-9+/=\n\r]+$/.test(content) && content.length > 1000) {
      return `data:image/png;base64,${content}`;
    }
  }

  // FORMAT 3: content array
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (typeof part.image_url === "string") {
        return part.image_url;
      }

      if (typeof part.image_url === "object" && part.image_url?.url) {
        return part.image_url.url;
      }

      if (part.type === "image" && part.data) {
        return `data:image/png;base64,${part.data}`;
      }

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
    return typeof msg.image_url === "string"
      ? msg.image_url
      : msg.image_url?.url;
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
