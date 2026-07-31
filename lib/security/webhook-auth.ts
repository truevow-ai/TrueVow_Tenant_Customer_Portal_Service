/**
 * WebhookSignature v1.0 — HMAC signing and verification
 *
 * Frozen contract. Every TrueVow service uses this same module.
 * Copy to: Customer Portal (TypeScript), INTAKE (Python), RETAINER (Python),
 *           SaaS Admin (TypeScript), TRACE (Python).
 *
 * Per-link key isolation — NO global shared secret.
 * Each caller-receiver pair has its own key_id:
 *   tv-intake-to-retainer-v1          (INTAKE → RETAINER)
 *   tv-retainer-to-saas-admin-v1      (RETAINER → SaaS Admin)
 *   tv-saas-admin-to-trace-v1         (SaaS Admin → TRACE)
 *
 * A key valid for one link MUST NOT be accepted on another.
 *
 * Env vars (per service, per link):
 *   TRUEVOW_WEBHOOK_KEY_ID=<tv-xxx-to-yyy-v1>
 *   TRUEVOW_WEBHOOK_SECRET=<link-specific-secret>
 *   TRUEVOW_WEBHOOK_SECONDARY_KEYS=[{"key_id":"tv-xxx-to-yyy-v2","secret":"..."}]
 */
import crypto from 'crypto';
import {
  CANONICAL_PATHS,
  WEBHOOK_SIGNATURE_CANONICAL_RULES,
} from '@/lib/contracts/index';

// ---------------------------------------------------------------------------
// Key registry — per-link key binding
// ---------------------------------------------------------------------------

interface RegisteredKey {
  key_id: string;
  secret: string;
  /** Which service this key is authorized for (caller of the webhook). */
  caller: string;
  /** Which paths this key is authorized to sign for. */
  allowed_paths: string[];
  /** Which methods this key is authorized for. */
  allowed_methods: string[];
}

function buildKeyRegistry(): RegisteredKey[] {
  const keys: RegisteredKey[] = [];

  // Primary key from env
  const primaryKeyId = process.env.TRUEVOW_WEBHOOK_KEY_ID;
  const primarySecret = process.env.TRUEVOW_WEBHOOK_SECRET;
  if (primaryKeyId && primarySecret) {
    keys.push({
      key_id: primaryKeyId,
      secret: primarySecret,
      caller: callerFromKeyId(primaryKeyId),
      allowed_paths: pathsForKeyId(primaryKeyId),
      allowed_methods: methodsForKeyId(primaryKeyId),
    });
  }

  // Rotation keys from env
  const secondaryRaw = process.env.TRUEVOW_WEBHOOK_SECONDARY_KEYS;
  if (secondaryRaw) {
    try {
      const secondary = JSON.parse(secondaryRaw);
      if (Array.isArray(secondary)) {
        for (const entry of secondary) {
          if (entry.key_id && entry.secret) {
            keys.push({
              key_id: entry.key_id,
              secret: entry.secret,
              caller: callerFromKeyId(entry.key_id),
              allowed_paths: pathsForKeyId(entry.key_id),
              allowed_methods: methodsForKeyId(entry.key_id),
            });
          }
        }
      }
    } catch { /* invalid JSON */ }
  }

  return keys;
}

/** Derive the expected caller service from a key_id pattern. */
function callerFromKeyId(keyId: string): string {
  const parts = keyId.split('-');
  if (parts.length >= 2) return parts[1].toUpperCase();
  return 'UNKNOWN';
}

/** Derive the allowed paths for a known key_id. */
function pathsForKeyId(keyId: string): string[] {
  if (keyId.startsWith('tv-intake-to-retainer')) {
    return [CANONICAL_PATHS.INTAKE_TO_RETAINER_CANDIDATE];
  }
  if (keyId.startsWith('tv-retainer-to-saas-admin')) {
    return [
      CANONICAL_PATHS.RETAINER_TO_SAAS_RESOLVE_CONFIG,
      CANONICAL_PATHS.RETAINER_TO_SAAS_ACTIVATE,
      CANONICAL_PATHS.RETAINER_TO_SAAS_RECONCILE,
    ];
  }
  if (keyId.startsWith('tv-saas-admin-to-trace')) {
    return [CANONICAL_PATHS.SAAS_ADMIN_TO_TRACE_MATTER_ACTIVATED];
  }
  return [];
}

/** Derive allowed methods for a known key_id. */
function methodsForKeyId(keyId: string): string[] {
  if (keyId.startsWith('tv-intake-to-retainer')) return ['POST'];
  if (keyId.startsWith('tv-retainer-to-saas-admin')) return ['GET', 'POST'];
  if (keyId.startsWith('tv-saas-admin-to-trace')) return ['POST'];
  return [];
}

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
  const keyId = process.env.TRUEVOW_WEBHOOK_KEY_ID || '';
  const secret = process.env.TRUEVOW_WEBHOOK_SECRET || '';
  const timestamp = Date.now().toString();
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');

  const signingString = `${timestamp}:${method.toUpperCase()}:${path}:${bodyHash}`;
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

/**
 * Verify an incoming webhook signature.
 *
 * Step 1: Validate HMAC (algorithm, timing-safe comparison).
 * Step 2: Validate replay window (5 minutes).
 * Step 3: Validate key binding — the key_id must be authorized for this
 *         caller-receiver pair, this path, and this method.
 *
 * An INTAKE key must not be accepted on RETAINER→SaaS Admin paths.
 * A RETAINER key must not be accepted on SaaS Admin→TRACE paths.
 */
export function verifySignature(
  headers: Record<string, string | string[] | undefined>,
  method: string,
  path: string,
  rawBody: string,
): { valid: false } | { valid: true; keyId: string; caller: string } {
  const keyId = headerValue(headers, 'x-truevow-key-id');
  const timestamp = headerValue(headers, 'x-truevow-timestamp');
  const signature = headerValue(headers, 'x-truevow-signature');

  if (!keyId || !timestamp || !signature) return { valid: false };

  // Replay protection
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return { valid: false };
  if (Math.abs(Date.now() - ts) > WEBHOOK_SIGNATURE_CANONICAL_RULES.replayWindowMs) {
    return { valid: false };
  }

  // Resolve key from registry
  const registry = buildKeyRegistry();
  const key = registry.find((k) => k.key_id === keyId);
  if (!key) return { valid: false };

  // Per-link path authorization — the key must be authorized for this path
  const normalizedPath = path.replace(/\/$/, ''); // strip trailing slash for comparison
  if (!key.allowed_paths.includes(normalizedPath)) {
    return { valid: false };
  }

  // Per-link method authorization
  if (!key.allowed_methods.includes(method.toUpperCase())) {
    return { valid: false };
  }

  // HMAC verification
  const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const signingString = `${timestamp}:${method.toUpperCase()}:${normalizedPath}:${bodyHash}`;
  const expected = crypto
    .createHmac('sha256', key.secret)
    .update(signingString)
    .digest('hex');

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex'),
    )
  ) {
    return { valid: false };
  }

  return { valid: true, keyId, caller: key.caller };
}

// ---------------------------------------------------------------------------
// Legacy migration
// ---------------------------------------------------------------------------

export function verifyLegacyBearer(
  token: string,
  allowedKeys: Set<string>,
): boolean {
  return allowedKeys.has(token);
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const val = headers[key];
  if (Array.isArray(val)) return val[0];
  return val;
}
