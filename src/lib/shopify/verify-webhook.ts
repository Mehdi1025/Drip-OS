import { createHmac, timingSafeEqual } from "crypto";

const HMAC_HEADER = "x-shopify-hmac-sha256";

/**
 * Verifies Shopify webhook authenticity using the raw request body.
 * @see https://shopify.dev/docs/apps/build/webhooks/subscribe/https#step-5-verify-the-webhook
 */
export function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string | null,
  secret: string
): boolean {
  if (!hmacHeader?.trim()) {
    return false;
  }

  const digest = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const digestBuffer = Buffer.from(digest, "utf8");
  const headerBuffer = Buffer.from(hmacHeader, "utf8");

  if (digestBuffer.length !== headerBuffer.length) {
    return false;
  }

  return timingSafeEqual(digestBuffer, headerBuffer);
}

export { HMAC_HEADER };
