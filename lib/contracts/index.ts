/**
 * TrueVow Canonical Contracts — shared across all backend services.
 *
 * Every backend service imports this module (via copy or shared package).
 * INTAKE reads SERVICE_WEBHOOK_RESPONSIBILITIES to know what to sign.
 * RETAINER reads it to know what to verify.
 * SaaS Admin reads it to know what paths to expose.
 *
 * This file is the authoritative registry. No service invents its own paths.
 */

// =========================================================================
// Schema version
// =========================================================================

export const WEBHOOK_SCHEMA_VERSION = '1.0.1' as const;

/** Date after which legacy Bearer tokens are rejected. */
export const LEGACY_MIGRATION_CUTOFF = '2026-09-01' as const;

// =========================================================================
// Canonical Paths — exact URL paths used in signing strings
// =========================================================================

/**
 * Every path here MUST match exactly what appears in the HMAC signing string.
 * Path only — no host, no port, no query string.
 */
export const CANONICAL_PATHS = {
  /** INTAKE → RETAINER: candidate submitted for representation review */
  INTAKE_TO_RETAINER_CANDIDATE:
    '/api/v1/retainer/webhooks/candidate-submitted',

  /** RETAINER → SaaS Admin: resolve matter configuration */
  RETAINER_TO_SAAS_RESOLVE_CONFIG:
    '/api/v1/matters/resolve-config',

  /** RETAINER → SaaS Admin: activate matter */
  RETAINER_TO_SAAS_ACTIVATE:
    '/api/v1/matters/activate',

  /** RETAINER → SaaS Admin: confirm activation reconciliation */
  RETAINER_TO_SAAS_RECONCILE:
    '/api/v1/matters/reconcile',
} as const;

export type CanonicalPath = (typeof CANONICAL_PATHS)[keyof typeof CANONICAL_PATHS];

// =========================================================================
// Service Webhook Responsibilities
// =========================================================================

/**
 * Which service SIGNS which call, and which service VERIFIES it.
 */
export interface WebhookResponsibility {
  /** The service that sends the webhook (signs the request). */
  signer: string;
  /** The service that receives the webhook (verifies the signature). */
  verifier: string;
  /** The canonical path used in the signing string. */
  path: CanonicalPath;
  /** HTTP method used in the signing string. */
  method: 'POST' | 'GET';
  /** Description of the integration point. */
  description: string;
}

export const SERVICE_WEBHOOK_RESPONSIBILITIES: WebhookResponsibility[] = [
  {
    signer: 'INTAKE',
    verifier: 'RETAINER',
    path: CANONICAL_PATHS.INTAKE_TO_RETAINER_CANDIDATE,
    method: 'POST',
    description: 'INTAKE delivers candidate.submitted_for_representation_review to RETAINER on intake completion',
  },
  {
    signer: 'RETAINER',
    verifier: 'SAAS_ADMIN',
    path: CANONICAL_PATHS.RETAINER_TO_SAAS_RESOLVE_CONFIG,
    method: 'GET',
    description: 'RETAINER queries SaaS Admin for matter activation configuration',
  },
  {
    signer: 'RETAINER',
    verifier: 'SAAS_ADMIN',
    path: CANONICAL_PATHS.RETAINER_TO_SAAS_ACTIVATE,
    method: 'POST',
    description: 'RETAINER submits matter activation with 9 evidence references',
  },
  {
    signer: 'RETAINER',
    verifier: 'SAAS_ADMIN',
    path: CANONICAL_PATHS.RETAINER_TO_SAAS_RECONCILE,
    method: 'POST',
    description: 'RETAINER confirms activation reconciliation after matter.activated',
  },
];

// =========================================================================
// Webhook Signature Canonical Rules
// =========================================================================

/**
 * Rules every implementation (TypeScript, Python, Go) must follow exactly.
 * Golden fixture tests in tests/security/webhook-signature.test.ts validate
 * these rules deterministically.
 */
export const WEBHOOK_SIGNATURE_CANONICAL_RULES = {
  /**
   * HTTP method casing. Must be uppercase.
   * Correct:   "POST"
   * Incorrect: "post"
   */
  methodCase: 'UPPERCASE' as const,

  /**
   * Path format. Path only, no host, no port, no query string.
   * Correct:   "/api/v1/matters/activate"
   * Incorrect: "https://host/api/v1/matters/activate?foo=bar"
   * Incorrect: "/api/v1/matters/activate/"   (no trailing slash)
   */
  pathFormat: 'PATH_ONLY_NO_TRAILING_SLASH' as const,

  /**
   * Body encoding for hashing. Raw bytes as received.
   * Sha256 hash computed on the exact body bytes (UTF-8).
   * Reserialized JSON that produces different whitespace will
   * produce a different hash and fail verification.
   */
  bodyEncoding: 'RAW_UTF8_BYTES' as const,

  /**
   * Signing string format.
   *   "{timestamp}:{method}:{path}:{bodyHash}"
   * Components separated by colon (:) with no whitespace.
   * Timestamp in milliseconds since epoch.
   * Method in uppercase.
   * Path as PATH_ONLY_NO_TRAILING_SLASH.
   * bodyHash as lowercase hex.
   */
  signingStringFormat: 'TIMESTAMP:METHOD:PATH:BODY_HASH' as const,

  /**
   * Algorithm: HMAC-SHA256.
   */
  algorithm: 'HMAC-SHA256' as const,

  /**
   * Signature encoding: lowercase hex.
   */
  signatureEncoding: 'LOWERCASE_HEX' as const,

  /**
   * Comparison: constant-time (timing-safe).
   * Python: hmac.compare_digest
   * Node:   crypto.timingSafeEqual
   * Go:     subtle.ConstantTimeCompare
   */
  comparison: 'CONSTANT_TIME' as const,

  /**
   * Replay protection: 5-minute window (300,000 ms).
   * Requests with timestamps beyond this window are rejected.
   */
  replayWindowMs: 300_000 as const,

  /**
   * Headers sent by signer, verified by verifier.
   * All lowercase. All required.
   */
  requiredHeaders: [
    'x-truevow-key-id',
    'x-truevow-timestamp',
    'x-truevow-signature',
  ] as const,

  /**
   * Key ID identifies which secret to use for verification.
   * Primary: tv-primary
   * Rotation support via TRUEVOW_WEBHOOK_SECONDARY_KEYS env var.
   */
  keyResolution: 'ENV_VAR_BY_KEY_ID' as const,
} as const;

// =========================================================================
// Activation Evidence Requirements
// =========================================================================

/**
 * The 9 evidence references required for matter activation.
 * Copied here so every service knows the canonical list.
 */
export const ACTIVATION_EVIDENCE_REQUIREMENTS = [
  { id: 'representation_decision', label: 'Representation Decision', required: true },
  { id: 'conflict_clearance', label: 'Conflict Clearance', required: true },
  { id: 'engagement_workflow', label: 'Engagement Workflow', required: true },
  { id: 'executed_package', label: 'Executed Package', required: true },
  { id: 'signature_evidence', label: 'Signature Evidence', required: true },
  { id: 'completed_copy_delivery', label: 'Completed Copy Delivery', required: true },
  { id: 'responsible_attorney', label: 'Responsible Attorney Assignment', required: true },
  { id: 'jurisdiction_profile', label: 'Jurisdiction Profile Version', required: true },
  { id: 'activation_policy', label: 'Activation Policy Version', required: true },
] as const;

export type ActivationEvidenceId = (typeof ACTIVATION_EVIDENCE_REQUIREMENTS)[number]['id'];
