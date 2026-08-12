# Architecture Decision: Customer Portal

**Date:** December 25, 2025 (original) · **Last Updated:** August 4, 2026  
**Status:** ✅ **APPROVED AND CONTINUOUSLY EVOLVING**

---

## 🎯 Original Decision (December 2025)

**Create a separate Customer Portal repository** for law firm users, distinct from the SaaS Admin portal.

---

## 📋 Original Context

TrueVow had three user groups at inception:

1. **TrueVow Staff** (Internal) — Manage all tenants, billing, system configuration
2. **Law Firm Users** (External Customers) — Use TrueVow services for their firm
3. **API Consumers** (Backend) — Multi-tenant backend services

**Question:** Should law firm users access services through:
- **Option A:** Separate Customer Portal repository (**CHOSEN ✅**)
- **Option B:** Embedded in SaaS Admin repository
- **Option C:** Direct API access only (no UI)

---

## ✅ Why Separate Repository (Still True)

### 1. Clear Separation of Concerns
```
SaaS Admin (Internal)          Customer Portal (External)
├── Manage ALL tenants         ├── View THEIR data only
├── System configuration       ├── Use services
├── Cross-tenant analytics     ├── Firm-specific settings
└── Billing management         └── Team management
```

### 2. Security Isolation
- **SaaS Admin:** Full system access, internal authentication
- **Customer Portal:** Tenant-scoped access, Supabase Auth via `@truevow/auth`
- **Benefit:** Prevents accidental cross-tenant data exposure

### 3. Independent Deployment
- Update customer-facing UI without affecting internal tools
- Scale independently based on customer usage

### 4. Technology Flexibility
- Customer Portal: Next.js 14, `@truevow/auth` (Supabase), Tailwind CSS, Zustand, React Query
- SaaS Admin: Next.js 14, Internal SSO, Different UI library

---

## 🏗️ Current Architecture (August 2026)

### Three-Portal Architecture (Phase 3 — July 2026)

| Portal | Repo | Users | Auth | Purpose |
|--------|------|-------|------|---------|
| **SaaS Admin** | `2025-TrueVow-SaaS-Administration` | TrueVow staff | Internal SSO | Manage tenants, billing |
| **Customer Portal** | This repo | Law-firm attorneys/staff | `@truevow/auth` (Supabase) | Intake, Trace, Retainer, Settle, Command |
| **Client Portal** | New repo (TBD) | Prospects, signed clients | Invitation token / OTP | Engagement review, uploads, messages |

### Full Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                      TRUEVOW ARCHITECTURE (v2)                        │
└──────────────────────────────────────────────────────────────────────┘

┌────────────────────────┐          ┌────────────────────────┐
│   SaaS Admin Portal    │          │    Client Portal       │
│   (Internal Staff)     │          │    (Prospects/Clients) │
│                        │          │                        │
│   Auth: Internal SSO   │          │   Auth: Invite Tokens  │
│   Data: Cross-tenant   │          │   Data: Own matters    │
└───────────┬────────────┘          └───────────┬────────────┘
            │                                    │
            │ API Calls                          │ API Calls
            ↓                                    ↓
┌──────────────────────────────────────────────────────────────────────┐
│                     Tenant Application (FastAPI)                      │
│                                                                      │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│   │ INTAKE API   │  │  TRACE API   │  │RETAINER API  │               │
│   │ Leads, stats │  │ Cases, liens │  │45 endpoints  │               │
│   └──────────────┘  └──────────────┘  └──────────────┘               │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│   │ SETTLE API   │  │ LEVERAGE API │  │ VERIFY  API  │               │
│   │Query,contrib │  │Damages,valid │  │Certificates  │               │
│   └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────┐       │
│   │              SaaS Admin DB (Supabase / PostgreSQL)        │       │
│   │   tenant_intake_leads_session, tenant_subscriptions, etc. │       │
│   └──────────────────────────────────────────────────────────┘       │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            │ API Proxy Calls (server-side only)
                            ↑
┌──────────────────────────────────────────────────────────────────────┐
│               Customer Portal (This Repo — Next.js 14)                │
│                                                                      │
│   Auth: @truevow/auth (Supabase) → user_metadata.tenantId             │
│                                                                      │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│   │ INTAKE   │ │  TRACE   │ │ RETAINER │ │  SETTLE  │               │
│   │Leads,Cal │ │Matters   │ │Conflicts │ │Analysis  │               │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                      │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│   │ BILLING  │ │  TEAM    │ │ NOTIFY   │ │ SETTINGS │               │
│   │Subs,Usage│ │Invite,RM │ │Inbox     │ │Profile   │               │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                      │
│   Retracted (code preserved, UI hidden):                             │
│   ┌──────────┐ ┌──────────┐                                          │
│   │ LEVERAGE │ │ CONNECT  │                                          │
│   │(retracted│ │(retracted│                                          │
│   │ Phase 2) │ │ Phase I) │                                          │
│   └──────────┘ └──────────┘                                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Portal Comparison Table

| Aspect | SaaS Admin | Customer Portal | Client Portal | Tenant App |
|--------|------------|-----------------|---------------|------------|
| **Users** | TrueVow staff | Law firm users | Prospects, clients | N/A (API) |
| **Auth** | Internal SSO | `@truevow/auth` | Invite tokens/OTP | API keys |
| **Scope** | All tenants | Single tenant | Own matters | Multi-tenant |
| **Tech** | Next.js | Next.js 14 | TBD | FastAPI |
| **Data Access** | Cross-tenant | Tenant-scoped | User-scoped | All data |
| **Deployment** | Internal | Public | Public | Internal |
| **Purpose** | Manage system | Use services | Client experience | Provide APIs |

---

## 🔐 Authentication Architecture

### Supabase Auth via `@truevow/auth` (Shared Library)

The portal uses a shared auth library (`@truevow/auth`) backed by Supabase Auth.

```
┌─────────────────────────────────────────────────────────┐
│                    Auth Flow                             │
├─────────────────────────────────────────────────────────┤
│  1. User visits portal                                   │
│  2. TrueVowAuthProvider wraps entire app                 │
│  3. useUser() hook checks Supabase session               │
│  4. useTenant() extracts tenantId from user_metadata     │
│  5. All API calls pass tenantId to backend               │
└─────────────────────────────────────────────────────────┘
```

**Key Implementation:**
```typescript
// hooks/useTenant.ts — Tenant resolution
const tenantId = user.user_metadata?.tenantId as string
                || process.env.NEXT_PUBLIC_DEV_TENANT_ID
                || null;

// All components consume it:
const { tenantId, userId } = useTenant();
```

**Dev Fallback:** `NEXT_PUBLIC_DEV_TENANT_ID` enables testing without live auth.

**Auth dependencies:** `@truevow/auth` (local: `../shared-libraries/auth`), `@supabase/ssr`, `@supabase/supabase-js`

---

## 📊 Current Service Matrix

### Active Services (in sidebar)

| # | Service | Route | Feature Gate | Pages | API Routes | Has Client |
|---|---------|-------|-------------|-------|-----------|------------|
| 1 | **Dashboard** | `/dashboard` | Always | 1 | — | — |
| 2 | **INTAKE** | `/dashboard/intake` | Always | 4 | 11 | `tenant-app-client.ts` |
| 3 | **Calendar** | `/dashboard/intake/calendar` | Always | 2 | 2 | — |
| 4 | **TRACE** | `/dashboard/trace` | `hasFeature('trace')` | 6 | 1 (catch-all) | `trace-client.ts` |
| 5 | **RETAINER** | `/dashboard/retainer` | `hasFeature('retainer')` | 6 | 1 (catch-all) | `retainer/client.ts` |
| 6 | **SETTLE** | `/dashboard/settle` | `hasFeature('settle')` | 7 | 8 | `settle-client.ts` |
| 7 | **Carrier Patterns** | `/dashboard/settle/carrier-patterns` | `hasFeature('settle')` | 1 | 1 | (settle-client) |
| 8 | **Billing & Usage** | `/dashboard/billing` | Always | 4 | 6 | `billing/client.ts` |
| 9 | **Notifications** | `/dashboard/notifications` | Always | 1 | 1 | — |
| 10 | **Team** | `/dashboard/team` | Always | 3 | 2 | — |
| 11 | **VERIFY** | `/dashboard/verify` | Always | 1 | — | `verify-client.ts` |
| 12 | **Settings** | `/dashboard/settings` | Always | 1 | 1 | — |

**Total: 13 services/modules, 54 page files, 62 API route files, 7 API clients**

### Retracted Services (code preserved, UI gated)

| Service | Status | Reason | Code Location |
|---------|--------|--------|---------------|
| **LEVERAGE** | Retracted Phase 2 | Replaced by TRACE + DRAFT | 11 pages, 19 API routes, `leverage-client.ts` |
| **CONNECT** | Retracted Phase I | Not in launch scope | 4 pages, `connect-client.ts` |
| **DRAFT** | Partial (no root page) | Legacy mode; damages/disbursement kept | 2 pages, `draft-client.ts` |
| **COMMAND** | Not built | Future roadmap | No code exists |

### Feature Gating System

```typescript
// hooks/useFeatureAccess.tsx — 6 gated features
hasFeature('intake' | 'leverage' | 'settle' | 'draft' | 'trace' | 'retainer')

// Flow:
//   user visits → useTenant() resolves tenantId
//   → fetchFeatureAccess(tenantId) → /api/billing/feature-access
//   → Billing Service returns: { features: { settle: { enabled: true }, ... } }
//   → Sidebar conditionally renders nav items
```

**Fallback:** If Billing Service is unreachable, all features are enabled (dev-friendly).

---

## 🔌 API Proxy Architecture

### Pattern: Server-Side Proxy for Every Backend Call

```
Browser                          Next.js API Route              Backend Service
  │                                    │                              │
  │  fetch('/api/settle/quote')        │                              │
  ├───────────────────────────────────→│                              │
  │                                    │  fetch(SETTLE_URL, {         │
  │                                    │    headers: {                │
  │                                    │      'X-API-Key': API_KEY    │
  │                                    │    }                         │
  │                                    │  })                          │
  │                                    ├─────────────────────────────→│
  │                                    │←─────────────────────────────┤
  │←───────────────────────────────────│                              │
  │  Returns JSON (API keys never      │                              │
  │  exposed to browser)               │                              │
```

### API Route Inventory (62 routes across 12 domains)

| Domain | Routes | Pattern |
|--------|--------|---------|
| **SETTLE** | 8 | Direct routes: `analysis`, `activate`, `carrier-patterns`, `consume`, `contribute`, `quote`, `reports`, `trends` |
| **LEVERAGE** | 19 | Nested: `cases`, `case/open`, `case/[caseId]/detail`, `case/[caseId]/events`, `case/[caseId]/damages`, etc. |
| **INTAKE** | 11 | Nested: `leads/[id]`, `leads/[id]/call`, `leads/[id]/notes`, `leads/[id]/reminders`, `stats`, `recordings/[callSid]`, etc. |
| **RETAINER** | 1 | Catch-all: `[...path]` with strict route allowlist (32 allowed patterns) |
| **TRACE** | 1 | Catch-all: `[...path]` |
| **BILLING** | 6 | `addons`, `dashboard`, `feature-access`, `invoices`, `subscription`, `usage` |
| **CS-SUPPORT** | 5 | `tickets`, `tickets/[id]`, `tickets/[id]/messages`, `tickets/[id]/reply`, `kb` |
| **TEAM** | 2 | `invite`, `provision-first-admin` |
| **SETTINGS** | 1 | `profile` |
| **CALENDAR** | 2 | `config`, `auto-unlock` |
| **ANALYTICS** | 1 | `track` |
| **REFERENCE** | 1 | `counties` |
| **NOTIFICATIONS** | 1 | Root route |

---

## 📦 Module Deep Dives

### RETAINER — Most Sophisticated Module (Architecture Pattern)

RETAINER exemplifies the portal's most refined integration pattern:

```
lib/api/retainer/
├── generated/
│   ├── schema.ts          (709 lines — 40+ TypeScript interfaces
│   │                        mapped 1:1 from RETAINER Pydantic schemas,
│   │                        includes EventEnvelope, EngagementState,
│   │                        CandidateHandoffRequest, ConflictSearchDetail,
│   │                        PackageDetailResponse, CeremonyDetailResponse,
│   │                        ConfirmActivationRequest, and many more)
│   └── openapi-hash.txt   (Contract hash for CI validation)
├── client.ts              (280 lines — 25+ typed methods:
│                            getReviewQueue, listCandidates,
│                            startConflictSearch, resolveTemplate,
│                            generatePackage, createCeremony,
│                            confirmActivation, etc.)
├── queries.ts             (259 lines — Route allowlist registry:
│                            32 explicitly allowlisted routes with
│                            HTTP methods, authority class enforcement,
│                            and pattern matcher)
├── errors.ts              (46 lines — 12 error codes mapped to
│                            user-friendly messages)
├── mappers.ts             (130 lines — Display mappers:
│                            STATE_DISPLAY, STATE_COLOR,
│                            DECISION_DISPLAY, AUTHORITY_DISPLAY)
├── composite-views.ts     (284 lines — UI projection builders:
│                            CandidateListItem, CandidateWorkspaceView,
│                            ActionQueue, LifecycleSummary)
└── openapi.yaml           (Committed RETAINER OpenAPI spec)
```

**Architecture Principles Demonstrated by RETAINER:**
1. **Contract-first:** Types generated from Pydantic schemas, validated via hash
2. **Route allowlist:** Strict whitelist — no catch-all forwarding (32 routes, each with authority class)
3. **Authority enforcement:** `ATTY_AUTH`, `STAFF_AUTH`, `FIRM_POLICY` checked per-route
4. **Stable error mapping:** `RET_AUTHORITY_MISSING`, `RET_STATE_CONFLICT`, etc.
5. **Composite views:** UI-specific projections built server-side from raw API responses

### SETTLE — Settlement Intelligence (Phases 1–4)

| Phase | Feature | Types Added | Status |
|-------|---------|-------------|--------|
| **1.0** | Core query + analysis | `EstimateRequest`, `EstimateResponse`, `ComparableCase` | ✅ Deployed |
| **2.1** | Confidence Score UI | `ConfidenceScoreData`, `ConfidenceFactor` (7 factors) | ✅ Deployed |
| **2.2** | Advanced Filter Controls | 9 new optional fields on `EstimateRequest` | ✅ Deployed |
| **2.3** | Carrier Patterns Analytics | `CarrierPattern`, `CarrierPatternsResponse` | ✅ Deployed |
| **3.1** | Multiplier Model Layer | `MultiplierMethod` (dual-method comparison) | ✅ Deployed |
| **3.2** | Overdemand Cliff Warning | `OverdemandCliff` (amber alert banner) | ✅ Deployed |
| **4.0** | Outcome Distribution | `OutcomeDistribution` (historical outcome table) | ✅ Deployed |

**SETTLE pages:** `/dashboard/settle` (main), `analysis`, `query`, `reports`, `trends`, `contribute`, `carrier-patterns`

### TRACE — Matter Management

A newer module for case tracking and evidence management. **6 pages:**
- `page.tsx` — Main landing
- `cases/page.tsx`, `cases/new/page.tsx` — Case CRUD
- `cases/[caseId]/page.tsx` — Case detail
- `cases/[caseId]/chronology/page.tsx` — Timeline
- `cases/[caseId]/providers/page.tsx` — Medical providers

**API client:** `trace-client.ts` — `createCase()`, `listCases()`, `getCase()`, `getProviders()`, `getChronology()`, `getLiens()`

### Product Label Separation

| Internal (this portal) | External (Client Portal) |
|---|---|
| RETAINER | Engagement |
| TRACE | My Matter / Requests |
| SETTLE | Settlement Review |

---

## 🧪 Testing Strategy

### Test Suite (6 spec files)

| File | Type | Scope |
|------|------|-------|
| `subscription-billing-usage.spec.ts` | E2E | Billing & usage |
| `service-specific-tests.spec.ts` | E2E | Per-service validation |
| `phase-2-features.spec.ts` | E2E | Phase 2 feature validation (22 cases) |
| `customer-use-cases.spec.ts` | E2E | Customer workflow scenarios |
| `database-crud-tests.spec.ts` | Backend | Database CRUD |
| `api-integration-tests.spec.ts` | Backend | API integration |

**Run commands:**
```bash
npm run test:e2e          # playwright test tests/e2e/
npm run test:backend      # playwright test tests/backend/
npm run test:all          # playwright test (all files)
npm run test:e2e:ui       # Playwright UI mode
npm run type-check        # tsc --noEmit
npm run lint              # next lint
```

---

## 🛠️ Tech Stack (Current)

```json
{
  "framework": "Next.js 14.2 (App Router)",
  "language": "TypeScript 5.3",
  "auth": "@truevow/auth (Supabase-backed shared library)",
  "styling": "Tailwind CSS 3.4",
  "state": "Zustand + React Query (@tanstack/react-query)",
  "http": "Axios",
  "charts": "Recharts",
  "icons": "Lucide React",
  "toasts": "Sonner",
  "dates": "date-fns",
  "rbac": "@truevow/rbac-engine (shared library)",
  "testing": "Playwright 1.57",
  "port": "3031 (dev), optional 3002 (draft mode)"
}
```

### Shared Libraries (local file dependencies)

| Library | Purpose | Path |
|---------|---------|------|
| `@truevow/auth` | Supabase auth provider, hooks (`useAuth`, `useUser`) | `../shared-libraries/auth` |
| `@truevow/rbac-engine` | Role-based access control engine | `../shared-libraries/rbac-engine` |

---

## 🎨 UI Architecture

### Theme System

Three modes defined as CSS custom properties in `app/globals.css`:
- `:root` — Light mode (default)
- `.dark` — Dark mode
- `.neutral` — Neutral/gray mode

Controlled by `hooks/useTheme.tsx` via `<html>` class toggling.

### Sidebar Navigation (12 items)

```
Dashboard                    (Always)
INTAKE & Leads               (Always)
Calendar                     (Always)
TRACE                        (hasFeature('trace'))
RETAINER                     (hasFeature('retainer'))
Settlement Intelligence      (hasFeature('settle'))
  └─ Carrier Patterns        (hasFeature('settle'))
Billing & Usage              (Always)
Messages & Notifications     (Always)
Team                         (Always)
VERIFY Service               (Always)
Settings                     (Always)

[Retracted / hidden in UI:]
  LEVERAGE                   (code exists, commented out)
  CONNECT Referrals          (code exists, hardcoded false)
```

---

## 🔄 Phase Evolution Timeline

| Phase | Date | What Changed |
|-------|------|-------------|
| **Phase 1** | Dec 2025 | Core portal: INTAKE, DRAFT, SETTLE, billing, team, settings, notifications |
| **Phase 1.5** | Jan 2026 | VERIFY service, CONNECT referrals, password recovery, subscription gating |
| **Phase 1.6** | Feb 2026 | Auth migration: Clerk → `@truevow/auth` (Supabase) |
| **Phase 2.0** | Mar 2026 | TRACE module added, LEVERAGE retracted, CONNECT retracted |
| **Phase 2.1** | May 2026 | SETTLE Confidence Score UI (7-factor breakdown with warnings) |
| **Phase 2.2** | May 2026 | SETTLE Advanced Filter Controls (9 new filter fields) |
| **Phase 2.3** | May 2026 | SETTLE Carrier Patterns Analytics (new page + API proxy) |
| **Phase 3.0** | Jul 2026 | RETAINER module, three-portal architecture, Client Portal separation |
| **Phase 3.1** | Jul 2026 | SETTLE Multiplier Model Layer (dual-method comparison) |
| **Phase 3.2** | Jul 2026 | SETTLE Overdemand Cliff Warning |
| **Phase 4.0** | Aug 2026 | SETTLE Outcome Distribution (historical outcomes + trial risk indicators) |

---

## 📈 Codebase Statistics (August 2026)

| Metric | Count |
|--------|-------|
| **Dashboard page files** | 54 |
| **API proxy route files** | 62 |
| **API client files** | 7 (+ retainer sub-module with 8 files) |
| **Test spec files** | 6 (4 E2E + 2 backend) |
| **Backend service domains** | 12 |
| **Active UI modules** | 9 (+ 3 retracted) |
| **Feature gates** | 6 |
| **Shared libraries** | 2 (`@truevow/auth`, `@truevow/rbac-engine`) |
| **Agent definitions** | 3 (architect, coder, qa) |
| **Skills** | 3 (phase-2-confidence-score, phase-2-advanced-filters, phase-2-carrier-patterns) |

---

## 📝 Key Architectural Principles

1. **Aggregation Layer Only** — The portal contains NO business logic. All data comes from backend microservices via API proxy routes.
2. **Server-Side Proxy Pattern** — All API calls go through Next.js API routes (`/api/*`) to avoid CORS and keep API keys server-side.
3. **Feature-Gated UI** — Sidebar items show/hide based on tenant's subscription tier from Billing Service.
4. **Tenant-ID in Every Call** — Extracted from Supabase `user_metadata.tenantId`, passed to all backend calls.
5. **Contract-First for Complex Modules** — RETAINER types are generated from Pydantic schemas, validated via hash.
6. **Strict Route Allowlists** — No catch-all forwarding for sensitive modules (RETAINER: 32 allowed routes).
7. **Composite Views** — UI-specific projections built server-side from raw API responses (RETAINER `composite-views.ts`).
8. **Graceful Degradation** — If Billing Service is down, all features default to enabled. If any service fails, UI shows meaningful errors.

---

## 🔮 Future Considerations

### Potential Enhancements:
1. **Mobile App:** Could reuse same API clients
2. **White-Label:** Customer Portal could be customized per tenant
3. **API Access:** Some customers may want direct API access too
4. **COMMAND Module:** Listed in architecture but not yet implemented
5. **LEVERAGE Reintroduction:** Code preserved; may re-emerge post-TRACE

### Scalability:
- Customer Portal can scale independently
- Can add CDN for static assets
- Can implement edge caching for API responses

### Data Ownership (Phase 3+)

| Owner | What it owns |
|-------|--------------|
| **Customer Portal** | UI preferences, saved filters, display settings |
| **RETAINER** | Representation decisions, conflicts, packages, signatures, activation |
| **TRACE** | Evidence requests, client responses, matter completeness |
| **Shared Platform** (future) | Client identity, access grants, branding, communications, documents, audit |

---

## 📞 References

### Documentation:
- **Developer Onboarding Guide:** `docs/developers/DEVELOPER_ONBOARDING_GUIDE.md`
- **Complete Features List:** `docs/features/COMPLETE_CUSTOMER_PORTAL_FEATURES.md`
- **Update Summary:** `docs/planning/CUSTOMER_PORTAL_UPDATE_SUMMARY.md`
- **E2E Testing Guide:** `docs/testing/CUSTOMER_PORTAL_E2E_TESTING_COMPLETE.md`
- **PRD Section:** `docs/prd/TRUEVOW_PRD_CUSTOMER_PORTAL_SECTION.md`

### Repositories:
- **Customer Portal:** This repo
- **SaaS Admin:** `2025-TrueVow-SaaS-Administration`
- **Tenant Application:** `2025-TrueVow-Tenant-Application`
- **Shared Libraries:** `shared-libraries/auth`, `shared-libraries/rbac-engine`

### Configuration:
- **Agent Config:** `opencode.json` (3-mode workflow: architect → coder → qa)
- **Agent Rules:** `.opencode/rules/agent-rules.md`
- **Skills:** `.opencode/skills/phase-2-*` (3 skills)

---

**Decision Made By:** AI Agent + User Collaboration  
**Approved By:** User  
**Status:** ✅ Implemented & Continuously Updated  
**Last Review:** August 4, 2026

---

*This architecture document reflects the live state of the codebase and is updated with each major phase.*
