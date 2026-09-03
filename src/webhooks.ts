import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Default tolerance (seconds) between the signed timestamp and now, for
 * {@link verifyWebhookSignature}. Matches the server's signing guidance and
 * the other EuroMail SDKs (PHP's `WebhookSignature::verify`, Python's
 * `verify_signature`).
 */
export const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Verify a webhook delivery's `X-Euromail-Signature` header.
 *
 * Every webhook payload is signed with HMAC-SHA256 over
 * `"{timestamp}.{raw_body}"` using the webhook's signing secret, sent in a
 * Stripe-style header: `t=<unix_timestamp>,v1=<hex_hmac_sha256>`. Verify
 * against the *raw* request body bytes/string, before any JSON parsing — a
 * round-tripped/re-serialized payload will not reproduce the same bytes and
 * the signature will not match.
 *
 * Returns `true` only if the header parses, at least one `v1` entry matches
 * (supports secret rotation, where the header may briefly carry signatures
 * for both the old and new secret), and the timestamp is within `tolerance`
 * seconds of `now` (defaults to the current time). Malformed input returns
 * `false` rather than throwing, so a webhook receiver can always treat a
 * `false` result as "reject the request".
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signatureHeader: string | null | undefined,
  secret: string,
  tolerance: number = DEFAULT_TOLERANCE_SECONDS,
  now?: number,
): boolean {
  if (!signatureHeader) return false;

  const body = typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;

  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (key === "t") {
      timestamp = value;
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (timestamp === undefined || signatures.length === 0 || !/^\d+$/.test(timestamp)) {
    return false;
  }

  const ts = Number.parseInt(timestamp, 10);
  const current = now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(current - ts) > tolerance) return false;

  const signedPayload = Buffer.concat([Buffer.from(`${ts}.`, "utf8"), body]);
  const expectedHex = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expected = Buffer.from(expectedHex, "hex");

  return signatures.some((sig) => {
    // A malformed candidate signature (wrong length/not hex) can't be
    // safely handed to timingSafeEqual, which throws on a length mismatch
    // rather than returning false.
    if (!/^[0-9a-f]+$/i.test(sig) || sig.length !== expectedHex.length) return false;
    const candidate = Buffer.from(sig, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}
