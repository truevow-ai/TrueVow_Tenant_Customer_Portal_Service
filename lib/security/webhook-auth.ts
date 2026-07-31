/**
 * WebhookSignature v1.0 — HMAC signing and verification
 *
 * Frozen contract. Every TrueVow service uses this same module.
 * Copy to: Customer Portal, INTAKE, RETAINER, SaaS Admin.
 *
 * Env vars (set on every service):
 *   TRUEVOW_WEBHOOK_KEY_ID=tv-primary
 *   TRUEVOW_WEBHOOK_SECRET=<shared-secret>
 *   TRUEVOW_WEBHOOK_SECONDARY_KEYS=[{"key_id":"tv-secondary","secret":"..."}]
 */
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Signing side — the service sending the webhook
// ---------------------------------------------------------------------------

export interface WebhookHeaders {
  'X-TrueVow-Key-Id': string;
  'X-TrueVow-Timestamp': string;
  'X-TrueVow-Signature': string;
}

export function signRequest(
  method: string,
  path: string,
  body: string,
): WebhookHeaders {
  const keyId = process.env.TRUEVOW_WEBHOOK_KEY_ID || 'tv-primary';
  const secret = process.env.TRUEVOW_WEBHOOK_SECRET || '';
  const timestamp = Date.now().toString();
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');

  // signing-string: timestamp:method:path:bodyHash
  const signingString = `${timestamp}:${method}:${path}:${bodyHash}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingString)
    .digest('hex');

  return {
    'X-TrueVow-Key-Id': keyId,
    'X-TrueVow-Timestamp': timestamp,
    'X-TrueVow-Signature': signature,
  };
}

// ---------------------------------------------------------------------------
// Verifying side — the service receiving the webhook
// ---------------------------------------------------------------------------

interface SecondaryKey {
  key_id: string;
  secret: string;
}

function getSecret(keyId: string): string {
  if (keyId === (process.env.TRUEVOW_WEBHOOK_KEY_ID || 'tv-primary')) {
    return process.env.TRUEVOW_WEBHOOK_SECRET || '';
  }

  const secondaryRaw = process.env.TRUEVOW_WEBHOOK_SECONDARY_KEYS;
  if (secondaryRaw) {
    try {
      const secondaryKeys: SecondaryKey[] = JSON.parse(secondaryRaw);
      const match = secondaryKeys.find((k) => k.key_id === keyId);
      if (match) return match.secret;
    } catch { /* invalid JSON, skip */ }
  }

  return '';
}

export function verifySignature(
  headers: Record<string, string | string[] | undefined>,
  method: string,
  path: string,
  rawBody: string,
): boolean {
  const keyId = headerValue(headers, 'x-truevow-key-id');
  const timestamp = headerValue(headers, 'x-truevow-timestamp');
  const signature = headerValue(headers, 'x-truevow-signature');

  if (!keyId || !timestamp || !signature) return false;

  // Replay protection — reject if timestamp > 5 minutes old
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  if (Math.abs(Date.now() - ts) > 300_000) return false;

  const secret = getSecret(keyId);
  if (!secret) return false;

  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const signingString = `${timestamp}:${method}:${path}:${bodyHash}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signingString)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex'),
  );
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const val = headers[key];
  if (Array.isArray(val)) return val[0];
  return val;
}
