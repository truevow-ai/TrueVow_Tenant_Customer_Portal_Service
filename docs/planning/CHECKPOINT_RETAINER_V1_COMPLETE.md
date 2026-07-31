# CHECKPOINT: RETAINER Customer Portal v1 — Implementation Complete

**Date:** 2026-07-31
**Status:** Implementation complete, ready for controlled pilot after live E2E
**Next Session:** Cross-product live E2E testing, Client Portal build

---

## Completed This Session

### Customer Portal (this repo)
- 6 RETAINER workspace pages with contract-mapped types
  - `/dashboard/retainer` — overview with action queues + lifecycle summaries + INTAKE enrichment
  - `/dashboard/retainer/candidates` — 13-state filter, pagination, batch INTAKE
  - `/dashboard/retainer/candidates/[id]` — 11 sections: Intake, Review, Conflict, Package, Client Activity, Signatures, Activation, Audit
  - `/dashboard/retainer/conflicts/[id]` — "No potential match found" terminology, hold/clear actions
  - `/dashboard/retainer/packages/[id]` — documents, preflight, delivery auth, lock hash verification
  - `/dashboard/retainer/activation/[id]` — 9 evidence items with Passed/Blocked/Pending/Stale/Unavailable

### Contract Pipeline
- `lib/api/retainer/openapi.yaml` — committed copy from RETAINER Backend
- `lib/api/retainer/generated/schema.ts` — 100+ types mapped 1:1 from Pydantic schemas
- `scripts/generate-retainer-api.cjs` — hash-based contract verifier
- `npm run generate:retainer-api` / `npm run check:retainer-contract`

### INTAKE Composition
- `lib/api/intake/adapter.ts` — resolveIntakeSummary/Batch/Detail, IntakeAvailability union
- `lib/api/retainer/composite-views.ts` — CandidateWorkspaceView, CandidateListItem, ActionQueue, LifecycleSummary
- Stale-version blocks sensitive actions (approve, conflict, activate)
- UUID never displayed as person name

### Security
- `lib/security/webhook-auth.ts` — WebhookSignature v1.0 (HMAC signing + verification)
- Restricted proxy with 34-route allowlist, Clerk auth, tenant verification
- Authority NOT enforced in proxy (backend is sole authority gate)
- `Permission` enum converted to const pattern for webpack compatibility

### RETAINER Backend (..TrueVow_Tenant_RETAINER_Service)
- Webhook endpoint `POST /webhooks/candidate-submitted` for INTAKE delivery
- Dual auth: HMAC (WebhookSignature v1.0) + legacy Bearer with deprecation warnings
- 133/133 backend tests pass

### Shared Infrastructure
- `@truevow/rbac-engine` Permission const pattern fix
- `@truevow/auth-client` dependencies installed
- Next.js `transpilePackages` for shared libs
- Removed unused sentry configs (no SENTRY_DSN)
- guard.ts ClerkDomain type assertions

### Architecture
- ADR amended: 4 user groups, Client Portal separation, Phase 3 decisions
- Product data ownership documented
- Scope ownership: RETAINER=ENGAGEMENT_HISTORY, Shared Platform=ACTIVE_MATTER

---

## Validation Gates

| Gate | Status |
|---|---|
| `check:retainer-contract` | PASS |
| TypeScript type-check | PASS (0 errors) |
| ESLint (retainer files) | PASS (0 warnings) |
| Production build | PASS |
| RETAINER backend suite | PASS (133/133) |

Contract hash: `f136f76318aa142a`

---

## Cross-Product Spine

```
INTAKE → POST /webhooks/candidate-submitted → RETAINER
RETAINER → GET /matters/resolve-config, POST /matters/activate → SaaS Admin
```

---

## Pending

- Cross-product live E2E (INTAKE + RETAINER + SaaS Admin + TRACE running simultaneously)
- Client Portal build (separate repo)
- Runtime proxy security tests
- Tenant-isolation runtime tests
- Full lifecycle integration test
