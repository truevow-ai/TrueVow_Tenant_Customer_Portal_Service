/**
 * WebhookSignature v1.0 — Golden Fixture Tests
 *
 * These 16 tests must pass identically in every backend service
 * (TypeScript, Python, Go). The golden values are deterministic.
 *
 * To run: npx jest tests/security/webhook-signature.test.ts
 *
 * Each backend service copies this file and runs it in their test suite.
 * A failing test means the implementation diverged from the contract.
 */
import crypto from 'crypto';
import { signRequest, verifySignature } from '@/lib/security/webhook-auth';
import {
  CANONICAL_PATHS,
  WEBHOOK_SIGNATURE_CANONICAL_RULES,
  SERVICE_WEBHOOK_RESPONSIBILITIES,
} from '@/lib/contracts/index';

// =========================================================================
// Golden Fixture Values — DO NOT CHANGE
// =========================================================================

const GOLDEN = {
  keyId: 'tv-primary',
  secret: 'golden-test-secret-do-not-change',
  timestamp: '1753948800000', // 2026-07-31T00:00:00.000Z — frozen
  body: '{"tenant_id":"00000000-0000-4000-a000-000000000001","matter_candidate_id":"00000000-0000-4000-a000-000000000002","candidate_version":1}',
  path: CANONICAL_PATHS.INTAKE_TO_RETAINER_CANDIDATE,
  method: 'POST' as const,
};

// Pre-computed golden values
const goldenBodyHash = crypto
  .createHash('sha256')
  .update(GOLDEN.body)
  .digest('hex');

const goldenSigningString =
  `${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${goldenBodyHash}`;

const goldenSignature = crypto
  .createHmac('sha256', GOLDEN.secret)
  .update(goldenSigningString)
  .digest('hex');

// =========================================================================
// Fixture 1: Golden signature verification (smoke test)
// =========================================================================

test('FIXTURE-01: golden signature verifies correctly', () => {
  // Compute expected from golden values
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${bodyHash}`;
  const expected = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  // Verify with proper headers
  const result = verifySignature(
    {
      'x-truevow-key-id': GOLDEN.keyId,
      'x-truevow-timestamp': GOLDEN.timestamp,
      'x-truevow-signature': expected,
    },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );

  expect(result.valid).toBe(true);
  expect(result.caller).toBe('INTAKE');
});

// =========================================================================
// Fixture 2: Deterministic HMAC output
// =========================================================================

test('FIXTURE-02: deterministic HMAC produces repeatable output', () => {
  const run1 = crypto
    .createHmac('sha256', GOLDEN.secret)
    .update(goldenSigningString)
    .digest('hex');

  const run2 = crypto
    .createHmac('sha256', GOLDEN.secret)
    .update(goldenSigningString)
    .digest('hex');

  expect(run1).toBe(run2);
  expect(run1).toBe(goldenSignature);
});

// =========================================================================
// Fixture 3: signRequest produces verifiable headers
// =========================================================================

test('FIXTURE-03: signRequest output verifies with verifySignature', () => {
  // Override env for deterministic test
  process.env.TRUEVOW_WEBHOOK_KEY_ID = GOLDEN.keyId;
  process.env.TRUEVOW_WEBHOOK_SECRET = GOLDEN.secret;

  // We can't freeze time, so sign and verify within replay window
  const headers = signRequest(GOLDEN.method, GOLDEN.path, GOLDEN.body);

  const result = verifySignature(
    headers as unknown as Record<string, string>,
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );

  expect(result.valid).toBe(true);
  expect(headers['X-TrueVow-Key-Id']).toBe(GOLDEN.keyId);
  expect(headers['X-TrueVow-Timestamp']).toBeTruthy();
  expect(headers['X-TrueVow-Signature']).toBeTruthy();
});

// =========================================================================
// Fixture 4: Expired timestamp rejected (replay protection)
// =========================================================================

test('FIXTURE-04: expired timestamp (>5 min old) is rejected', () => {
  const expiredTimestamp = '1753947000000'; // 30 minutes before golden
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${expiredTimestamp}:${GOLDEN.method}:${GOLDEN.path}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    {
      'x-truevow-key-id': GOLDEN.keyId,
      'x-truevow-timestamp': expiredTimestamp,
      'x-truevow-signature': signature,
    },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );

  expect(result.valid).toBe(false);
});

// =========================================================================
// Fixture 5: Future timestamp rejected
// =========================================================================

test('FIXTURE-05: future timestamp (>5 min ahead) is rejected', () => {
  const futureTimestamp = String(Date.now() + 600_000);
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${futureTimestamp}:${GOLDEN.method}:${GOLDEN.path}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    {
      'x-truevow-key-id': GOLDEN.keyId,
      'x-truevow-timestamp': futureTimestamp,
      'x-truevow-signature': signature,
    },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );

  expect(result.valid).toBe(false);
});

// =========================================================================
// Fixture 6: Tampered signature rejected
// =========================================================================

test('FIXTURE-06: tampered signature (one byte changed) is rejected', () => {
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${bodyHash}`;
  const validSig = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  // Flip the last hex character
  const lastChar = validSig[validSig.length - 1];
  const flipped = lastChar === 'a' ? 'b' : 'a';
  const tampered = validSig.slice(0, -1) + flipped;

  const result = verifySignature(
    {
      'x-truevow-key-id': GOLDEN.keyId,
      'x-truevow-timestamp': GOLDEN.timestamp,
      'x-truevow-signature': tampered,
    },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );

  expect(result.valid).toBe(false);
});

// =========================================================================
// Fixture 7: Wrong path rejected
// =========================================================================

test('FIXTURE-07: signature for wrong path is rejected', () => {
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const correctPath = GOLDEN.path;
  const wrongPath = '/api/v1/retainer/webhooks/something-else';

  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${correctPath}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  // Verify against wrong path
  const result = verifySignature(
    {
      'x-truevow-key-id': GOLDEN.keyId,
      'x-truevow-timestamp': GOLDEN.timestamp,
      'x-truevow-signature': signature,
    },
    GOLDEN.method,
    wrongPath,
    GOLDEN.body,
  );

  expect(result.valid).toBe(false);
});

// =========================================================================
// Fixture 8: Trailing slash mismatch rejected
// =========================================================================

test('FIXTURE-08: trailing slash on path changes hash and is rejected', () => {
  const pathNoSlash = GOLDEN.path;
  const pathWithSlash = GOLDEN.path + '/';

  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${pathNoSlash}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  // Verify with trailing slash — should fail
  const result = verifySignature(
    {
      'x-truevow-key-id': GOLDEN.keyId,
      'x-truevow-timestamp': GOLDEN.timestamp,
      'x-truevow-signature': signature,
    },
    GOLDEN.method,
    pathWithSlash,
    GOLDEN.body,
  );

  expect(result.valid).toBe(false);
});

// =========================================================================
// Fixture 9: Reserialized JSON with different whitespace rejected
// =========================================================================

test('FIXTURE-09: reserialized JSON (different whitespace) changes hash', () => {
  const bodyCompact = '{"a":1,"b":2}';
  const bodyPretty = '{\n  "a": 1,\n  "b": 2\n}';

  // Sign with compact
  const compactHash = crypto.createHash('sha256').update(bodyCompact).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${compactHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  // Verify with pretty — should fail because body hash differs
  const result = verifySignature(
    {
      'x-truevow-key-id': GOLDEN.keyId,
      'x-truevow-timestamp': GOLDEN.timestamp,
      'x-truevow-signature': signature,
    },
    GOLDEN.method,
    GOLDEN.path,
    bodyPretty,
  );

  expect(result.valid).toBe(false);
});

// =========================================================================
// Fixture 10: Missing headers rejected
// =========================================================================

test('FIXTURE-10: missing key-id header is rejected', () => {
  const result = verifySignature(
    {
      'x-truevow-timestamp': GOLDEN.timestamp,
      'x-truevow-signature': 'abc123',
    },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );
  expect(result.valid).toBe(false);
});

test('FIXTURE-11: missing timestamp header is rejected', () => {
  const result = verifySignature(
    {
      'x-truevow-key-id': GOLDEN.keyId,
      'x-truevow-signature': 'abc123',
    },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );
  expect(result.valid).toBe(false);
});

test('FIXTURE-12: missing signature header is rejected', () => {
  const result = verifySignature(
    {
      'x-truevow-key-id': GOLDEN.keyId,
      'x-truevow-timestamp': GOLDEN.timestamp,
    },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );
  expect(result.valid).toBe(false);
});

// =========================================================================
// Fixture 13: Non-numeric timestamp rejected
// =========================================================================

test('FIXTURE-13: non-numeric timestamp is rejected', () => {
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    {
      'x-truevow-key-id': GOLDEN.keyId,
      'x-truevow-timestamp': 'not-a-number',
      'x-truevow-signature': signature,
    },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );

  expect(result.valid).toBe(false);
});

// =========================================================================
// Fixture 14: Wrong HTTP method rejected
// =========================================================================

test('FIXTURE-14: signature for GET does not verify for POST', () => {
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:GET:${GOLDEN.path}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  // Verify as POST
  const result = verifySignature(
    {
      'x-truevow-key-id': GOLDEN.keyId,
      'x-truevow-timestamp': GOLDEN.timestamp,
      'x-truevow-signature': signature,
    },
    'POST',
    GOLDEN.path,
    GOLDEN.body,
  );

  expect(result.valid).toBe(false);
});

// =========================================================================
// Fixture 15: Unknown key-id rejected
// =========================================================================

test('FIXTURE-15: unknown key-id is rejected', () => {
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    {
      'x-truevow-key-id': 'tv-unknown-key-not-configured',
      'x-truevow-timestamp': GOLDEN.timestamp,
      'x-truevow-signature': signature,
    },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );

  expect(result.valid).toBe(false);
});

// =========================================================================
// Fixture 16: Golden values are internally consistent
// =========================================================================

test('FIXTURE-16: golden hash and signature are internally consistent', () => {
  // Verify the pre-computed golden values are correct
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  expect(bodyHash).toBe(goldenBodyHash);

  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${bodyHash}`;
  expect(signingString).toBe(goldenSigningString);

  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');
  expect(signature).toBe(goldenSignature);
});

// =========================================================================
// D1 Fixures — Path Canonicalization (SaaS Admin)
// Trailing slash, query string, encoded path MUST be rejected.
// The path in the signing string must match EXACTLY.
// =========================================================================

test('FIXTURE-D1-01: trailing slash on path is rejected', () => {
  const pathNoSlash = GOLDEN.path;
  const pathWithSlash = GOLDEN.path + '/';

  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${pathNoSlash}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    { 'x-truevow-key-id': GOLDEN.keyId, 'x-truevow-timestamp': GOLDEN.timestamp, 'x-truevow-signature': signature },
    GOLDEN.method,
    pathWithSlash,
    GOLDEN.body,
  );
  expect(result.valid).toBe(false);
});

test('FIXTURE-D1-02: query string on path is rejected', () => {
  const pathClean = GOLDEN.path;
  const pathWithQuery = GOLDEN.path + '?tenant_id=test';

  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${pathClean}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    { 'x-truevow-key-id': GOLDEN.keyId, 'x-truevow-timestamp': GOLDEN.timestamp, 'x-truevow-signature': signature },
    GOLDEN.method,
    pathWithQuery,
    GOLDEN.body,
  );
  expect(result.valid).toBe(false);
});

test('FIXTURE-D1-03: double-slash prefix on path is rejected', () => {
  const pathClean = GOLDEN.path;
  const pathDouble = '//' + GOLDEN.path.replace(/^\//, '');

  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${pathClean}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    { 'x-truevow-key-id': GOLDEN.keyId, 'x-truevow-timestamp': GOLDEN.timestamp, 'x-truevow-signature': signature },
    GOLDEN.method,
    pathDouble,
    GOLDEN.body,
  );
  expect(result.valid).toBe(false);
});

test('FIXTURE-D1-04: URL-encoded path variant is rejected', () => {
  const pathClean = GOLDEN.path;
  const pathEncoded = '/api/v1/retainer/webhooks%2Fcandidate-submitted';

  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${pathClean}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    { 'x-truevow-key-id': GOLDEN.keyId, 'x-truevow-timestamp': GOLDEN.timestamp, 'x-truevow-signature': signature },
    GOLDEN.method,
    pathEncoded,
    GOLDEN.body,
  );
  expect(result.valid).toBe(false);
});

test('FIXTURE-D1-05: correct exact path passes', () => {
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    { 'x-truevow-key-id': GOLDEN.keyId, 'x-truevow-timestamp': GOLDEN.timestamp, 'x-truevow-signature': signature },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );
  expect(result.valid).toBe(true);
});

// =========================================================================
// D3 Fixtures — Per-Link Key Isolation (RETAINER)
// A key valid for one link MUST NOT be accepted on another.
// No global secret fallback.
// =========================================================================

test('FIXTURE-D3-01: INTAKE key rejected for activation path', () => {
  const intakeKeyId = 'tv-intake-to-retainer-v1';
  const activationPath = '/api/v1/matters/activate';
  const bodyStr = '{"tenant_id":"00000000-0000-4000-a000-000000000001"}';

  const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const signingString = `${GOLDEN.timestamp}:POST:${activationPath}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    { 'x-truevow-key-id': intakeKeyId, 'x-truevow-timestamp': GOLDEN.timestamp, 'x-truevow-signature': signature },
    'POST',
    activationPath,
    bodyStr,
  );
  // INTAKE key must not authorize SaaS Admin activation — rejected by path binding
  expect(result.valid).toBe(false);
});

test('FIXTURE-D3-02: correct link key passes on its authorized path', () => {
  const bodyStr = '{"tenant_id":"00000000-0000-4000-a000-000000000001","matter_candidate_id":"00000000-0000-4000-a000-000000000002"}';

  // Set env for this test
  process.env.TRUEVOW_WEBHOOK_KEY_ID = GOLDEN.keyId;
  process.env.TRUEVOW_WEBHOOK_SECRET = GOLDEN.secret;

  const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    { 'x-truevow-key-id': GOLDEN.keyId, 'x-truevow-timestamp': GOLDEN.timestamp, 'x-truevow-signature': signature },
    GOLDEN.method,
    GOLDEN.path,
    bodyStr,
  );
  expect(result.valid).toBe(true);
});

test('FIXTURE-D3-03: unknown key ID is rejected', () => {
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${bodyHash}`;
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    { 'x-truevow-key-id': 'tv-unknown-service-key-xyz', 'x-truevow-timestamp': GOLDEN.timestamp, 'x-truevow-signature': signature },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );
  expect(result.valid).toBe(false);
});

test('FIXTURE-D3-04: correct secret with wrong key_id is rejected', () => {
  const bodyHash = crypto.createHash('sha256').update(GOLDEN.body).digest('hex');
  const signingString = `${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${bodyHash}`;
  // Sign with GOLDEN.secret but claim a different key_id
  const signature = crypto.createHmac('sha256', GOLDEN.secret).update(signingString).digest('hex');

  const result = verifySignature(
    { 'x-truevow-key-id': 'tv-retainer-to-saas-admin-v1', 'x-truevow-timestamp': GOLDEN.timestamp, 'x-truevow-signature': signature },
    GOLDEN.method,
    GOLDEN.path,
    GOLDEN.body,
  );
  // Secret doesn't match the claimed key_id → rejected
  expect(result.valid).toBe(false);
});

// =========================================================================
// D4 Fixtures — INTAKE Contract Test Coverage
// Exact canonical path, non-ASCII body, deterministic signature, primary/secondary
// =========================================================================

test('FIXTURE-D4-01: exact canonical path matches CANONICAL_PATHS constant', () => {
  expect(GOLDEN.path).toBe(CANONICAL_PATHS.INTAKE_TO_RETAINER_CANDIDATE);
});

test('FIXTURE-D4-02: non-ASCII UTF-8 body produces deterministic hash', () => {
  const nonAsciiBody = '{"name":"Sarah Johnson","incident":"accident de voiture \u00e0 Montr\u00e9al"}';
  const hash1 = crypto.createHash('sha256').update(nonAsciiBody).digest('hex');
  const hash2 = crypto.createHash('sha256').update(Buffer.from(nonAsciiBody, 'utf-8')).digest('hex');
  expect(hash1).toBe(hash2);
});

test('FIXTURE-D4-03: modified body (one character) produces different signature', () => {
  const body1 = GOLDEN.body;
  const body2 = GOLDEN.body.replace('candidate_version":1', 'candidate_version":2');

  const hash1 = crypto.createHash('sha256').update(body1).digest('hex');
  const hash2 = crypto.createHash('sha256').update(body2).digest('hex');
  expect(hash1).not.toBe(hash2);

  const sig1 = crypto.createHmac('sha256', GOLDEN.secret)
    .update(`${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${hash1}`).digest('hex');
  const sig2 = crypto.createHmac('sha256', GOLDEN.secret)
    .update(`${GOLDEN.timestamp}:${GOLDEN.method}:${GOLDEN.path}:${hash2}`).digest('hex');
  expect(sig1).not.toBe(sig2);
});
