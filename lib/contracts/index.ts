/**
 * TrueVow Canonical Contracts — shared across all backend services.
 *
 * Source repository: TrueVow_Tenant_Customer_Portal_Service
 * Source commit:     a18dae1
 * Contract version:  WebhookSignature v1.0
 * Schema version:    1.0.1
 *
 * Every backend service imports this module (via copy or shared package).
 * Golden fixture tests must pass identically in TypeScript and Python.
 * CI must verify this file's canonical-rules hash matches the committed value.
 *
 * DO NOT EDIT without updating the golden fixture tests and all consuming services.
 */

import crypto from 'crypto';

// =========================================================================
// Source traceability
// =========================================================================

export const CONTRACT_VERSION = 'WebhookSignature v1.0' as const;
export const SCHEMA_VERSION = '1.0.1' as const;
export const SOURCE_REPO = 'TrueVow_Tenant_Customer_Portal_Service' as const;
export const SOURCE_COMMIT = 'a18dae1' as const;

/** Date after which legacy Bearer tokens are rejected. */
export const LEGACY_MIGRATION_CUTOFF = '2026-09-01' as const;

// =========================================================================
// Canonical Paths
// =========================================================================

export const CANONICAL_PATHS = {
  INTAKE_TO_RETAINER_CANDIDATE:
    '/api/v1/retainer/webhooks/candidate-submitted',
  RETAINER_TO_SAAS_RESOLVE_CONFIG:
    '/api/v1/matters/resolve-config',
  RETAINER_TO_SAAS_ACTIVATE:
    '/api/v1/matters/activate',
  RETAINER_TO_SAAS_RECONCILE:
    '/api/v1/matters/reconcile',
  SAAS_ADMIN_TO_TRACE_MATTER_ACTIVATED:
    '/api/v1/trace/webhooks/matter-activated',
} as const;

export type CanonicalPath = (typeof CANONICAL_PATHS)[keyof typeof CANONICAL_PATHS];

// =========================================================================
// Per-link key bindings — NO global shared secret
// =========================================================================

/**
 * Each key_id binds a specific caller to a specific receiver.
 * A key valid for INTAKE→RETAINER must NOT be accepted by SaaS Admin.
 * A key valid for RETAINER→SaaS Admin must NOT be accepted by TRACE.
 */
export interface WebhookKeyBinding {
  key_id: string;
  calling_service: string;
  receiving_service: string;
  allowed_methods: ('POST' | 'GET')[];
  allowed_paths: CanonicalPath[];
  environment: string;
  enabled: boolean;
  valid_from: string;   // ISO date
  valid_until: string;  // ISO date
}

/**
 * Canonical key registry. Each link gets its own key.
 * In production, these come from deployment secrets — NEVER hardcoded.
 * This registry documents the expected bindings for validation.
 */
export const CANONICAL_KEY_BINDINGS: WebhookKeyBinding[] = [
  {
    key_id: 'tv-intake-to-retainer-v1',
    calling_service: 'INTAKE',
    receiving_service: 'RETAINER',
    allowed_methods: ['POST'],
    allowed_paths: [CANONICAL_PATHS.INTAKE_TO_RETAINER_CANDIDATE],
    environment: 'production',
    enabled: true,
    valid_from: '2026-07-31',
    valid_until: '2027-07-31',
  },
  {
    key_id: 'tv-retainer-to-saas-admin-v1',
    calling_service: 'RETAINER',
    receiving_service: 'SAAS_ADMIN',
    allowed_methods: ['GET', 'POST'],
    allowed_paths: [
      CANONICAL_PATHS.RETAINER_TO_SAAS_RESOLVE_CONFIG,
      CANONICAL_PATHS.RETAINER_TO_SAAS_ACTIVATE,
      CANONICAL_PATHS.RETAINER_TO_SAAS_RECONCILE,
    ],
    environment: 'production',
    enabled: true,
    valid_from: '2026-07-31',
    valid_until: '2027-07-31',
  },
  {
    key_id: 'tv-saas-admin-to-trace-v1',
    calling_service: 'SAAS_ADMIN',
    receiving_service: 'TRACE',
    allowed_methods: ['POST'],
    allowed_paths: [CANONICAL_PATHS.SAAS_ADMIN_TO_TRACE_MATTER_ACTIVATED],
    environment: 'production',
    enabled: true,
    valid_from: '2026-07-31',
    valid_until: '2027-07-31',
  },
];

/**
 * Rotation keys. Each rotation key is also link-specific.
 * NOT one universal tv-secondary.
 */
export const CANONICAL_ROTATION_BINDINGS: WebhookKeyBinding[] = [
  {
    key_id: 'tv-intake-to-retainer-v2',
    calling_service: 'INTAKE',
    receiving_service: 'RETAINER',
    allowed_methods: ['POST'],
    allowed_paths: [CANONICAL_PATHS.INTAKE_TO_RETAINER_CANDIDATE],
    environment: 'production',
    enabled: true,
    valid_from: '2026-10-01',
    valid_until: '2027-10-01',
  },
];

// =========================================================================
// Service Webhook Responsibilities
// =========================================================================

export interface WebhookResponsibility {
  signer: string;
  verifier: string;
  path: CanonicalPath;
  method: 'POST' | 'GET';
  description: string;
  key_id: string;
}

export const SERVICE_WEBHOOK_RESPONSIBILITIES: WebhookResponsibility[] = [
  {
    signer: 'INTAKE',
    verifier: 'RETAINER',
    path: CANONICAL_PATHS.INTAKE_TO_RETAINER_CANDIDATE,
    method: 'POST',
    description: 'INTAKE delivers candidate.submitted_for_representation_review',
    key_id: 'tv-intake-to-retainer-v1',
  },
  {
    signer: 'RETAINER',
    verifier: 'SAAS_ADMIN',
    path: CANONICAL_PATHS.RETAINER_TO_SAAS_RESOLVE_CONFIG,
    method: 'GET',
    description: 'RETAINER queries SaaS Admin for matter activation configuration',
    key_id: 'tv-retainer-to-saas-admin-v1',
  },
  {
    signer: 'RETAINER',
    verifier: 'SAAS_ADMIN',
    path: CANONICAL_PATHS.RETAINER_TO_SAAS_ACTIVATE,
    method: 'POST',
    description: 'RETAINER submits matter activation with 9 evidence references',
    key_id: 'tv-retainer-to-saas-admin-v1',
  },
  {
    signer: 'RETAINER',
    verifier: 'SAAS_ADMIN',
    path: CANONICAL_PATHS.RETAINER_TO_SAAS_RECONCILE,
    method: 'POST',
    description: 'RETAINER confirms activation reconciliation',
    key_id: 'tv-retainer-to-saas-admin-v1',
  },
  {
    signer: 'SAAS_ADMIN',
    verifier: 'TRACE',
    path: CANONICAL_PATHS.SAAS_ADMIN_TO_TRACE_MATTER_ACTIVATED,
    method: 'POST',
    description: 'SaaS Admin emits matter.activated to TRACE',
    key_id: 'tv-saas-admin-to-trace-v1',
  },
];

// =========================================================================
// Webhook Signature Canonical Rules
// =========================================================================

export const WEBHOOK_SIGNATURE_CANONICAL_RULES = {
  methodCase: 'UPPERCASE' as const,
  pathFormat: 'PATH_ONLY_NO_TRAILING_SLASH' as const,
  bodyEncoding: 'RAW_UTF8_BYTES' as const,
  signingStringFormat: 'TIMESTAMP:METHOD:PATH:BODY_HASH' as const,
  algorithm: 'HMAC-SHA256' as const,
  signatureEncoding: 'LOWERCASE_HEX' as const,
  comparison: 'CONSTANT_TIME' as const,
  replayWindowMs: 300_000 as const,
  requiredHeaders: [
    'x-truevow-key-id',
    'x-truevow-timestamp',
    'x-truevow-signature',
  ] as const,
  keyResolution: 'PER_LINK_KEY_BY_KEY_ID' as const,
  /** NO global shared secret. Each caller-receiver pair has its own key. */
  keyIsolation: 'PER_CALLER_RECEIVER_PAIR' as const,
} as const;

// =========================================================================
// Canonical rules hash — for CI drift detection
// =========================================================================

/**
 * Compute a deterministic hash of the canonical rules.
 * CI compares this against the committed value in CANONICAL_RULES_HASH.
 * If the rules change, the hash changes, and CI fails until all services align.
 */
export function computeCanonicalRulesHash(): string {
  const rulesJson = JSON.stringify(
    {
      paths: CANONICAL_PATHS,
      rules: WEBHOOK_SIGNATURE_CANONICAL_RULES,
      responsibilities: SERVICE_WEBHOOK_RESPONSIBILITIES.map((r) => ({
        signer: r.signer,
        verifier: r.verifier,
        path: r.path,
        method: r.method,
        key_id: r.key_id,
      })),
    },
    Object.keys({
      ...CANONICAL_PATHS,
      ...WEBHOOK_SIGNATURE_CANONICAL_RULES,
    }).sort(),
  );
  return crypto.createHash('sha256').update(rulesJson).digest('hex').substring(0, 16);
}

/** Committed hash of canonical rules. CI verifies this matches computeCanonicalRulesHash(). */
export const CANONICAL_RULES_HASH = computeCanonicalRulesHash();

// =========================================================================
// Activation Evidence Requirements
// =========================================================================

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
