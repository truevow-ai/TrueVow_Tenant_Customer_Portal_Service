# TrueVow Customer Portal — Developer Onboarding Guide

**For:** Entry-level software developers joining the project  
**Purpose:** Complete understanding of architecture, integrations, use cases, edge cases, and production troubleshooting  
**Last Updated:** August 4, 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Service Dependencies](#3-service-dependencies)
4. [Codebase Structure](#4-codebase-structure)
5. [Key Features & Use Cases](#5-key-features--use-cases)
6. [Data Flow & Integrations](#6-data-flow--integrations)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Feature Gating System](#8-feature-gating-system)
9. [Environment Configuration](#9-environment-configuration)
10. [Common Edge Cases](#10-common-edge-cases)
11. [Debugging & Troubleshooting](#11-debugging--troubleshooting)
12. [Production Support Playbook](#12-production-support-playbook)
13. [Development Workflow](#13-development-workflow)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment Pipeline](#15-deployment-pipeline)

---

## 1. System Overview

### What is TrueVow Customer Portal?

TrueVow Customer Portal is a **Next.js-based aggregation layer** that provides law firm attorneys with a unified dashboard to access multiple microservices:

- **INTAKE** — Lead management pipeline (Benjamin AI intake engine)
- **TRACE** — Matter/evidence tracking and case management
- **RETAINER** — Engagement management (45 endpoints, 13 workflow states)
- **SETTLE** — Settlement intelligence database (query, analysis, carrier patterns)
- **LEVERAGE** — Retracted (code preserved); DRAFT for basic validations
- **Billing & Usage** — Subscription management, feature access control
- **VERIFY** — Certificate verification system
- **Team Management** — Staff invitations and permissions

### Key Design Principles

1. **Aggregation Layer Only** — The portal contains NO business logic. All data comes from backend microservices via API calls.
2. **Server-Side Proxy Pattern** — All API calls go through Next.js API routes (`/api/*`) to avoid CORS and keep API keys server-side.
3. **Feature-Gated UI** — Sidebar items show/hide based on tenant's subscription tier (fetched from Billing Service).
4. **Supabase Authentication** — Multi-tenant auth via `@truevow/auth` shared library; `tenant_id` and `user_id` passed to all backend calls.

### What Runs Where?

| Component | Port | Purpose |
|-----------|------|---------|
| **Customer Portal** | 3031 | This Next.js app (frontend + API proxy) |
| **Billing Service** | 3016 | Feature flags, subscription tiers, usage tracking |
| **Intake Engine** | varies | Benjamin AI lead processing |
| **TRACE Service** | varies | Matter/evidence tracking |
| **RETAINER Service** | varies | Engagement management (45 endpoints) |
| **SETTLE Service** | varies | Settlement database queries |
| **LEVERAGE Service** | varies | Retracted; DRAFT for validations |

**Important:** The portal NEVER directly calls external services from the browser. Always goes through `/api/*` proxy routes.

---

## 2. Architecture & Tech Stack

### Frontend Stack

```json
{
  "framework": "Next.js 14.2.35 (App Router)",
  "language": "TypeScript 5.x",
  "styling": "TailwindCSS 3.x + CSS custom properties",
  "state": "Zustand + React Query (@tanstack/react-query)",
  "auth": "@truevow/auth (Supabase-backed shared library)",
  "charts": "Recharts",
  "icons": "Lucide React",
  "toasts": "Sonner",
  "dates": "date-fns"
}
```

### Backend Integration Pattern

```typescript
// Browser component
const { data } = await fetch('/api/billing/feature-access', { 
  method: 'GET' 
});

// Next.js API route (/api/billing/feature-access/route.ts)
export async function GET(request: NextRequest) {
  const res = await fetch(`${BILLING_BASE}/api/v1/billing/tenants/${tenantId}/feature-access`, {
    headers: { 'X-API-Key': API_KEY } // ← API key stays server-side
  });
  return NextResponse.json(data);
}
```

### CSS Architecture

**File:** `app/globals.css`

Three theme modes defined as CSS custom properties:
- `:root` — Light mode (default)
- `.dark` — Dark mode
- `.neutral` — Neutral/gray mode (ChatGPT-style)

**Theme switching:** Controlled by `hooks/useTheme.tsx` hook, which toggles the class on `<html>` element.

**Accessibility override example:**
```css
/* Outside all @layer blocks so this wins over Tailwind utilities */
html:not(.dark) .text-gray-400 {
  color: rgb(75 85 99) !important; /* gray-600 — 7.0:1 contrast on white */
}
```

---

## 3. Service Dependencies

### Critical Dependencies (Must Be Running)

| Service | Env Variable | Default | Health Check Endpoint |
|---------|-------------|---------|----------------------|
| **Billing Service** | `TENANT_BILLING_SERVICE_URL` | `http://localhost:3016` | `GET /api/v1/billing/tenants/{id}/feature-access` |
| **Tenant App API** | `TENANT_APP_URL` | varies | Varies by service |

### Fallback Behavior When Services Are Down

**Billing Service offline?** → All features enabled by default (see `app/api/billing/feature-access/route.ts` fallback logic)

```typescript
// Fallback response when billing service unreachable
return NextResponse.json({
  tier: 'growth',
  features: {
    intake:  { enabled: true },
    draft:   { enabled: true },
    settle:  { enabled: true },
    connect: { enabled: false },
  },
  _fallback: true,
});
```

**Why this matters:** During local development, if port 3016 isn't responding, LEVERAGE and SETTLE sections still appear in sidebar. In production, this would indicate a real outage.

---

## 4. Codebase Structure

```
Truevow-Customer-Portal/
├── app/
│   ├── (dashboard)/              # Main authenticated layout
│   │   ├── layout.tsx            # Sidebar + theme toggle + feature provider
│   │   └── dashboard/
│   │       ├── page.tsx          # Dashboard home (command center)
│   │       ├── intake/           # INTAKE module (leads, calendar)
│   │       │   ├── lead/[id]/    # Lead detail
│   │       │   ├── calendar/     # Calendar view
│   │       │   └── calendar-config/
│   │       ├── trace/            # TRACE module (matter tracking)
│   │       │   ├── cases/        # Case list
│   │       │   │   ├── new/      # New matter
│   │       │   │   └── [caseId]/ # Case detail, chronology, providers
│   │       ├── retainer/         # RETAINER module (engagement)
│   │       │   ├── candidates/   # Candidate review
│   │       │   ├── conflicts/    # Conflict search
│   │       │   ├── packages/     # Fee packages
│   │       │   └── activation/   # Activation workflow
│   │       ├── settle/           # SETTLE module (7 pages)
│   │       │   ├── analysis/     # Case analysis with confidence scores
│   │       │   ├── query/        # Query with advanced filters
│   │       │   ├── reports/      # Generate reports
│   │       │   ├── trends/       # Settlement trends
│   │       │   ├── contribute/   # Contribute data
│   │       │   └── carrier-patterns/  # Carrier analytics
│   │       ├── billing/          # Billing, usage, invoices, subscribe
│   │       ├── team/             # Team management (invite, edit)
│   │       ├── verify/           # Certificate verification
│   │       ├── settings/         # Profile, password, firm info
│   │       ├── notifications/    # Messages & notifications inbox
│   │       └── demo/             # Toast notification demo
│   ├── api/                      # API proxy routes (62 routes, 12 domains)
│   │   ├── settle/               # 8 routes (analysis, quote, carrier-patterns, etc.)
│   │   ├── intake/               # 11 routes (leads, stats, recordings, seed)
│   │   ├── trace/                # 1 route (catch-all proxy)
│   │   ├── retainer/             # 1 route (catch-all with 32-route allowlist)
│   │   ├── billing/              # 6 routes (feature-access, subscription, usage, etc.)
│   │   ├── leverage/             # 19 routes (retracted, code preserved)
│   │   ├── team/                 # 2 routes (invite, provision-first-admin)
│   │   ├── settings/             # 1 route (profile)
│   │   ├── calendar/             # 2 routes (config, auto-unlock)
│   │   ├── analytics/            # 1 route (track)
│   │   ├── reference/            # 1 route (counties)
│   │   ├── notifications/        # 1 route
│   │   └── cs-support/           # 5 routes (tickets, kb)
│   ├── (auth)/                   # Auth pages
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   └── forgot-password/
│   ├── layout.tsx                # Root layout (TrueVowAuthProvider)
│   └── page.tsx                  # Landing page (pre-auth)
├── components/
│   ├── ui/                       # Reusable UI components
│   ├── intake/                   # INTAKE-specific components
│   ├── connect/                  # CONNECT referral components (retracted)
│   └── certificates/             # VERIFY certificate components
├── hooks/
│   ├── useTenant.ts              # Gets tenant_id from Supabase user_metadata
│   ├── useFeatureAccess.tsx      # Feature flag hook (6 features gated)
│   ├── useServiceAccess.ts       # Service-level access control
│   ├── useTheme.tsx              # Theme switcher (light/neutral/dark)
│   └── useUsageStats.ts          # Usage metrics from Billing Service
├── lib/
│   ├── api/                      # API client wrappers
│   │   ├── tenant-app-client.ts  # INTAKE (leads, stats, recordings, SMS)
│   │   ├── settle-client.ts      # SETTLE (estimate, contribute, reports, carrier patterns)
│   │   ├── trace-client.ts       # TRACE (cases, providers, chronology, liens)
│   │   ├── leverage-client.ts    # LEVERAGE (retracted; 17+ methods)
│   │   ├── draft-client.ts       # DRAFT legacy validations
│   │   ├── connect-client.ts     # CONNECT (retracted)
│   │   ├── verify-client.ts      # VERIFY certificates
│   │   ├── cs-support-client.ts  # Customer support tickets
│   │   ├── certificates.ts       # Blockchain certificates
│   │   ├── retainer/             # RETAINER (most mature client)
│   │   │   ├── generated/schema.ts   # 709 lines, 40+ types from Pydantic
│   │   │   ├── client.ts             # 280 lines, 25+ typed methods
│   │   │   ├── queries.ts            # Route allowlist (32 patterns)
│   │   │   ├── errors.ts             # Error code → message mapping
│   │   │   ├── mappers.ts            # Display labels & colors
│   │   │   └── composite-views.ts    # UI projection builders
│   │   └── intake/
│   │       └── adapter.ts        # INTAKE→RETAINER data adapter
│   ├── billing/
│   │   └── client.ts             # Billing API types (FeatureAccessResponse, Tier)
│   ├── subscriptions/            # Subscription utilities
│   ├── db/                       # Database helpers (SaaS Admin DB)
│   └── utils.ts                  # Utility functions
├── .env.local                    # Environment variables (DO NOT COMMIT)
├── opencode.json                 # 3-mode agent config (architect, coder, qa)
├── next.config.js                # Next.js config
├── tailwind.config.ts            # Tailwind theme customization
└── tsconfig.json                 # TypeScript config
```

### Key Files to Read First

1. **`app/(dashboard)/layout.tsx`** — Sidebar navigation, feature gating logic, idle timeout tracking
2. **`hooks/useFeatureAccess.tsx`** — How feature flags work (6 features: intake, leverage, settle, draft, trace, retainer)
3. **`hooks/useTenant.ts`** — Tenant ID resolution from Supabase user_metadata
4. **`app/api/billing/feature-access/route.ts`** — API proxy pattern example
5. **`lib/api/settle-client.ts`** — SETTLE client with 14 types across Phases 1–4
6. **`lib/api/retainer/client.ts`** — RETAINER client (best example of mature integration pattern)

---

## 5. Key Features & Use Cases

### 5.1 Dashboard Home (Command Center)

**File:** `app/(dashboard)/dashboard/page.tsx`

**Purpose:** Attorney's daily command center showing:
- Revenue risk indicator (locked leads requiring immediate action)
- Lead funnel stats (new leads, contacted, converted)
- Quick actions (Validate document, Calculate deadline, Query settlements)
- Upcoming deadlines (statute of limitations, EEOC charges)

**Use Case:** Attorney logs in first thing Monday morning to see which leads need urgent follow-up.

**Edge Case:** If `tenant_intake_leads_session` table is empty, shows "No leads yet — configure your intake form".

---

### 5.2 INTAKE Module

**Routes:** `/dashboard/intake`, `/dashboard/intake/leads/[id]`

**Backend Dependency:** Benjamin AI Intake Engine

**Data Source:** SaaS Admin DB table `tenant_intake_leads_session`

**Key Components:**
- `LeadsList.tsx` — Filterable/sortable lead table
- `LeadDetailPage.tsx` — Full lead profile + call recordings + transcripts
- `CallQueue.tsx` — Listen to recorded intake calls

**Use Case:** Attorney reviews yesterday's 3 new leads, listens to call recording, marks 2 as "Contacted" and 1 as "Not Qualified".

**Edge Cases:**
- Recording URL returns 404 → Twilio file expired (30-day retention)
- Transcript missing → ASR service failed, retry manually
- Lead status shows "Duplicate" → Merged by phone number match

---

### 5.3 LEVERAGE Service

**Routes:** `/dashboard/leverage/*`

**Backend Dependency:** LEVERAGE Service (separate microservice)

**API Clients:** `lib/api/draft-client.ts` (legacy validation), `lib/api/leverage-client.ts` (case economics & lifecycle)

**Features:**
1. **Document Validation** — Paste legal document text, get compliance report
2. **Deadline Calculator** — Enter case details, get SOL/EEOC deadlines
3. **Validation History** — View past validations
4. **Damages Calculator** — Real-time PI damages estimation with liability adjustment
5. **Disbursement Calculator** — Case cost analysis with settlement what-if scenarios
6. **Case Management** — Open, track, and manage cases; convert INTAKE leads to cases
7. **Reward Credits** — Track service credits and transaction history
8. **Analytics** — Compliance health and case value metrics

**Use Case — Document Validation:** Paralegal drafts a PI complaint for California Superior Court, runs validation, fixes 3 errors (missing prayer for relief, incorrect venue statement, omitted CCP citation).

**Use Case — Damages Calculator:** Attorney evaluates a $150K medical specials case, sets liability at 75%, sees adjusted gross of $487.5K with settlement range $292.5K–$414.4K, prints worksheet for file.

**Use Case — Lead Conversion:** Attorney reviews 5 qualified INTAKE leads, clicks "Convert from Lead" on a slip-and-fall case, form auto-populates with incident type and state, attorney opens case in LEVERAGE.

**API Endpoints Called:**
```typescript
// Document Validation (legacy DRAFT endpoints)
POST /api/v1/validation/validate   // Validate document
POST /api/v1/deadlines/calculate   // Calculate deadlines
GET  /api/v1/draft/stats           // Get usage stats

// Case Economics (LEVERAGE endpoints)
POST /api/v1/leverage/damages              // Calculate damages
POST /api/v1/leverage/disbursement         // Calculate disbursement
POST /api/v1/leverage/case/open            // Open new case ($79 charge)
GET  /api/v1/leverage/cases                // List all cases
GET  /api/v1/leverage/case/{id}/economics  // Merged damages + disbursement
POST /api/v1/leverage/case/{id}/damages/save    // Save damages worksheet
POST /api/v1/leverage/case/{id}/disbursement/save // Save disbursement worksheet
GET  /api/v1/leverage/rewards/ledger       // Reward transaction history
GET  /api/v1/leverage/rewards/summary      // Reward balance summary
```

**Edge Cases:**
- Document < 20 characters → Returns error "Document too short"
- State not supported → Returns "Jurisdiction not available"
- Deadline already passed → Urgency = "OVERDUE" (dark red badge)
- No cases exist yet → Cases page shows "0 total cases" with "Open New Case" CTA
- Lead missing state info → State field remains blank, attorney must fill manually
- Backend analytics endpoint missing → Analytics page falls back to DRAFT validation data

---

### 5.4 SETTLE Service

**Routes:** `/dashboard/settle`, `/dashboard/settle/analysis/[caseId]`

**Backend Dependency:** SETTLE Settlement Intelligence Service

**Use Case:** Attorney settling a slip-and-fall case queries database for similar cases in Duval County, FL, sees median settlement is $14,500 (based on 146 comparable cases).

**Data Displayed:**
- 25th/50th/75th percentile settlement amounts
- Sample size (number of comparable cases)
- Jurisdiction weight (confidence score)
- Key factors affecting outcome (liability strength, medical specials)

**Edge Cases:**
- Sample size < 20 → Shows warning "Insufficient data for county-level analysis"
- Policy limits unknown → Confidence level reduced
- Insurer not in database → Shows "Unknown insurer negotiation pattern"

---

### 5.5 Billing & Usage

**Route:** `/dashboard/billing`

**Backend Dependency:** Billing Service (port 3016)

**Features:**
- Current subscription tier (Growth/Pro/Enterprise)
- Usage stats (API calls remaining, documents validated)
- Invoice history
- Upgrade/downgrade options

**Use Case:** Office manager checks if they've hit their monthly document validation limit before submitting another batch.

**Edge Case:** Tenant on "Founding Member" tier → Unlimited validations, no caps shown.

---

### 5.6 Team Management

**Route:** `/dashboard/team`

**Backend Dependency:** Platform Service API + SaaS Admin DB

**Features:**
- Invite staff members (paralegals, associates, admins)
- Assign roles (Admin, Attorney, Viewer)
- Manage permissions per module

**Use Case:** Law firm partner invites new associate, grants access to INTAKE and SETTLE but not Billing.

**Edge Case:** Invited email already exists in another tenant → Error "User already belongs to a different organization".

---

## 6. Data Flow & Integrations

### 6.1 Authentication Flow

```mermaid
graph TB
    A[User visits portal] --> B{Authenticated?}
    B -->|No| C[Supabase sign-in page]
    B -->|Yes| D[Dashboard layout loads]
    D --> E[useTenant hook fires]
    E --> F[Get tenant_id from Supabase user_metadata]
    F --> G[Fetch /api/billing/feature-access]
    G --> H[Billing Service returns features]
    H --> I[Sidebar renders with gated items]
```

### 6.2 API Call Flow (Example: Validate Document)

```mermaid
sequenceDiagram
    participant U as User
    participant P as Portal Page
    participant AP as API Proxy
    participant L as LEVERAGE Service
    
    U->>P: Clicks "Run Validation"
    P->>AP: POST /api/v1/validation/validate
    AP->>L: POST with X-API-Key header
    L-->>AP: Returns validation result
    AP-->>P: Returns JSON
    P-->>U: Shows compliance report
```

### 6.3 Database Sources

| Data Type | Source | Table/Collection |
|-----------|--------|------------------|
| Leads & Intake Sessions | SaaS Admin DB | `tenant_intake_leads_session` |
| Feature Flags & Tiers | Billing Service DB | `tenant_subscriptions` |
| Usage Metrics | Billing Service DB | `usage_tracking` |
| Team Members | SaaS Admin DB | Via Platform Service API |

**Critical Rule:** Portal NEVER queries databases directly. Always through service APIs.

---

## 7. Authentication & Authorization

### Supabase Auth via `@truevow/auth`

**Provider:** `@truevow/auth` (shared library, backed by Supabase)  
**Config:** `app/layout.tsx` wraps everything in `<TrueVowAuthProvider>`

The shared auth library provides:
- `TrueVowAuthProvider` — Auth context wrapper
- `useUser()` — Returns `{ user, loading }` from Supabase session
- `useAuth()` — Returns `{ signOut, signIn }` methods

### Multi-Tenant Model

```typescript
// Every user belongs to a tenant via Supabase user_metadata
// Set during tenant creation via auth.admin.updateUserById:
//   supabaseAdmin.auth.admin.updateUserById(userId, {
//     user_metadata: { tenantId: 'uuid-here', role: 'admin' }
//   });

interface SupabaseUser {
  id: string;              // UUID from Supabase Auth
  email: string;
  user_metadata: {
    tenantId: string;      // This is the tenant identifier
    full_name?: string;
    role?: 'admin' | 'member';
  };
}
```

### Extracting Tenant ID

**Hook:** `hooks/useTenant.ts`

```typescript
export function useTenant(): TenantContext {
  const { user, loading } = useUser();

  if (!user) return { tenantId: null, isAuthenticated: false, ... };

  const tenantId = user.user_metadata?.tenantId
                || process.env.NEXT_PUBLIC_DEV_TENANT_ID
                || null;

  return {
    tenantId,
    userId: user.id || null,
    userEmail: user.email || null,
    userName: user.user_metadata?.full_name || user.email || null,
    isLoading: false,
    isAuthenticated: true,
    error: null,
  };
}
```

**Usage in every component:**
```typescript
const { tenantId, userId } = useTenant();
const estimate = await settleClient.getEstimate(tenantId, request);
```

**Dev fallback:** When `NEXT_PUBLIC_DEV_TENANT_ID` is set, `useTenantDev()` returns a fake user context for testing without live Supabase.

### RBAC Integration

The portal also integrates `@truevow/rbac-engine` (shared library) for role-based access control. Feature-level access is managed through `hasFeature()` in the feature gating system, while service-level access uses `hasServiceAccess()` in the subscriptions module.

| Role | Can Access Billing? | Can Invite Team? | Can Manage Leads? |
|------|---------------------|------------------|-------------------|
| **Admin** | Yes | Yes | Yes |
| **Member** | No | No | No |

**Enforcement:** Done in backend services using `orgRole` passed from portal.

---

## 8. Feature Gating System

### How It Works

1. **On mount,** `useFeatureAccess` hook calls `/api/billing/feature-access?tenantId={id}`
2. **API route** proxies to Billing Service with API key
3. **Billing Service** returns:
```json
{
  "tier": "growth",
  "features": {
    "intake":   { "enabled": true },
    "trace":    { "enabled": true },
    "retainer": { "enabled": false },
    "settle":   { "enabled": true },
    "leverage": { "enabled": false },
    "draft":    { "enabled": false }
  }
}
```
4. **Sidebar** conditionally renders:
```typescript
{hasFeature('trace') && (
  <NavLink href="/dashboard/trace">TRACE</NavLink>
)}
```

### Fallback Logic

**If Billing Service is unreachable:**
- Enable ALL features (intake, trace, retainer, settle, leverage, draft)
- Log warning: `[billing/feature-access] Billing service unreachable — falling back to all-features-enabled`
- Add `_fallback: true` to response for debugging

**Why?** Better to show extra features during dev than break the entire portal.

### Override for Testing

Set env variable:
```bash
NEXT_PUBLIC_PHASE_ONE=true  # Hides DRAFT, SETTLE, CONNECT
```

---

## 9. Environment Configuration

### Required Variables (.env.local)

```ini
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Billing Service (REQUIRED for prod, optional for dev with fallback)
TENANT_BILLING_SERVICE_URL=http://localhost:3016
TENANT_BILLING_SERVICE_API_KEY=bill_key_abc123

# Tenant App API Base (REQUIRED for INTAKE/TRACE/RETAINER/SETTLE calls)
TENANT_APP_URL=http://localhost:3031
TENANT_APP_API_KEY=app_key_xyz789

# Dev Fallback (OPTIONAL — enables testing without live auth)
NEXT_PUBLIC_DEV_TENANT_ID=test-tenant-uuid

# Analytics Service (OPTIONAL - gracefully degrades if down)
TENANT_ANALYTICS_SERVICE_URL=http://localhost:3020
TENANT_ANALYTICS_API_KEY=analytics_key_abc123

# Phase Toggle (OPTIONAL)
NEXT_PUBLIC_PHASE_ONE=false
```

### How to Rotate API Keys

1. Generate new key in Billing Service dashboard
2. Update `.env.local` line 10: `TENANT_BILLING_SERVICE_API_KEY=new_key_here`
3. Restart dev server: `npm run dev`
4. Test: Visit `/dashboard/billing` → should load without 502 error

### Common Env Mistakes

❌ **Hardcoded localhost:**
```typescript
const API_URL = 'http://localhost:3016'; // WRONG!
```

✅ **Always use env:**
```typescript
const API_URL = process.env.TENANT_BILLING_SERVICE_URL || 'http://localhost:3016';
```

---

## 10. Common Edge Cases

### 10.1 Authentication Edge Cases

**Problem:** User logs in with different tenant → portal shows wrong tenant data

**Root Cause:** `useTenant()` hook cached old `orgId`

**Fix:** Clear browser localStorage or force re-fetch:
```typescript
const { tenantId, isLoading } = useTenant();
if (isLoading) return <Spinner />; // ← Always handle loading state
```

**Problem:** User logged out mid-session → API calls fail silently

**Symptom:** Console shows `401 Unauthorized` but UI doesn't redirect

**Fix:** Add global error boundary in `app/layout.tsx`:
```typescript
onError={(error) => {
  if (error.status === 401) {
    router.push('/sign-in');
  }
}}
```

---

### 10.2 API Timeout Edge Cases

**Problem:** LEVERAGE service takes >30s to validate large documents

**Symptom:** Toast shows "Validation failed" but backend actually succeeded

**Timeout Config:** `lib/api/draft-client.ts`
```typescript
axios.create({ timeout: 30000 }); // 30 seconds
```

**Fix:** Increase timeout or add polling:
```typescript
// For long-running validations, use async job pattern
POST /api/v1/validation/validate → returns { jobId: 'abc123' }
GET  /api/v1/validation/status/abc123 → poll until complete
```

---

### 10.3 Data Consistency Edge Cases

**Problem:** Lead marked as "Contacted" in INTAKE → Dashboard still shows "New Lead"

**Root Cause:** Dashboard caches old data from `tenant_intake_leads_session`

**Fix:** Force re-fetch after mutations:
```typescript
// After updating lead status
mutate(); // ← React Query re-fetches
// OR
router.refresh(); // ← Next.js server refresh
```

**Problem:** Billing shows "Unlimited plan" but usage card shows "5/10 validations used"

**Root Cause:** Billing Service returned `validations_remaining: null` (unlimited) but frontend assumed numeric value

**Fix:** Handle null explicitly:
```typescript
value={stats?.validations_remaining === null ? '∞' : String(stats.validations_remaining)}
```

---

### 10.4 Theme Switching Edge Cases

**Problem:** User switches to dark mode → some labels become unreadable

**Root Cause:** Hardcoded `text-gray-400` fails WCAG contrast on dark backgrounds

**Fix:** Global CSS override in `globals.css`:
```css
html.dark .text-gray-400 {
  color: rgb(156 163 175); /* gray-400 passes on dark bg */
}
```

**Problem:** Theme flashes light on page reload

**Fix:** Add `suppressHydration_warning` to `<html>` tag and persist theme in localStorage:
```typescript
useEffect(() => {
  const saved = localStorage.getItem('tv-theme');
  document.documentElement.classList.add(saved || 'light');
}, []);
```

---

## 11. Debugging & Troubleshooting

### 11.1 Local Development Setup Checklist

```bash
# 1. Install dependencies
npm install

# 2. Copy .env.example to .env.local
cp .env.backup.ini .env.local

# 3. Verify ports are free
netstat -ano | findstr :3031  # Should return nothing

# 4. Start dev server
npm run dev

# 5. Open http://localhost:3031
```

### 11.2 Common Errors & Fixes

#### Error: `EADDRINUSE: address already in use :::3031`

**Cause:** Old Node process still running

**Fix (PowerShell):**
```powershell
Stop-Process -Name node -Force
npm run dev
```

---

#### Error: `Billing service unreachable` in console

**Cause:** Billing Service not running on port 3016

**Check:**
```powershell
Get-NetTCPConnection -LocalPort 3016 -State Listen
```

**Fix Options:**
1. Start Billing Service on 3016
2. OR let fallback logic enable all features (dev only)

**Verify Fallback Active:**
```typescript
// Look for this log in terminal
[billing/feature-access] Billing service unreachable — falling back to all-features-enabled
```

---

#### Error: Sidebar missing LEVERAGE/SETTLE sections

**Cause:** Feature flags returning `enabled: false`

**Debug Steps:**
1. Open Network tab → filter `/api/billing/feature-access`
2. Check response:
```json
{
  "features": {
    "draft": { "enabled": false }  // ← This is why it's hidden
  }
}
```
3. Either:
   - Update tenant's subscription in Billing Service DB
   - OR temporarily set `NEXT_PUBLIC_PHASE_ONE=false` in `.env.local`

---

#### Error: `404 Not Found` on `/api/intake/leads`

**Cause:** INTAKE service not running or wrong base URL

**Debug:**
```bash
# Check if INTAKE service is up
curl http://localhost:<INTAKE_PORT>/health

# Check env variable
grep TENANT_APP_URL .env.local
```

**Fix:** Update `TENANT_APP_URL` to correct port.

---

### 11.3 Using Browser DevTools Effectively

**Network Tab:**
- Filter by `/api/` to see all backend calls
- Check status codes (200 = OK, 502 = service down, 401 = auth issue)
- Inspect request headers → verify `X-API-Key` present

**Console Tab:**
- Search for `[billing/feature-access]` to see feature flag logs
- Look for red errors (not warnings)

**React DevTools Extension:**
- Inspect `useFeatureAccess` hook state
- Verify `hasFeature('draft')` returns expected boolean

---

### 11.4 Reading Server Logs

**Terminal Output Decoded:**

```
✓ Compiled /dashboard/leverage in 12.6s (1236 modules)
  ↑ Successful page compilation

[billing/feature-access] Billing service unreachable — falling back to all-features-enabled
  ↑ Expected during dev if Billing Service is off

POST /api/analytics/track 200 in 4338ms
  ↑ Analytics call succeeded (200) but slow (4.3s)

GET /api/billing/feature-access?tenantId=e2362e1c 502 in 6563ms
  ↑ Billing Service returned 502 (Bad Gateway) → fallback triggered
```

---

## 12. Production Support Playbook

### 12.1 Monitoring Dashboards

**Health Checks to Monitor:**

| Endpoint | Expected Response | Alert Threshold |
|----------|-------------------|-----------------|
| `GET /api/billing/feature-access` | 200 OK | >3 failures in 5 min |
| `GET /dashboard` | 200 OK | Load time >5s |
| `POST /api/analytics/track` | 200 OK | >10% failure rate |

**Logging Aggregator:** (Assume Datadog/Sentry integration)
- Search for `ERROR` in server logs
- Filter by `tenant_id` for specific customer issues

---

### 12.2 Incident Response Runbook

#### Scenario 1: Users Report "Blank White Page"

**Step 1: Reproduce**
- Open browser console → look for JS errors
- Check Network tab → any 500/502/503 errors?

**Step 2: Isolate**
- Is it one user or all users?
- Did it start after a deployment?

**Step 3: Rollback (if deployment-related)**
```bash
git revert HEAD
git push origin main
```

**Step 4: Communicate**
- Post in status page: "Investigating blank page issue"
- ETA: 15 minutes

---

#### Scenario 2: LEVERAGE Validations Timing Out

**Symptom:** Users report "Validation failed" after 30s

**Step 1: Check LEVERAGE Service Health**
```bash
curl -X POST https://<LEVERAGE_HOST>/api/v1/validation/validate \
  -H "X-API-Key: $KEY" \
  -d '{"document_text":"test"}'
```

**Step 2: Scale LEVERAGE Service**
- If CPU >80%, add more replicas
- If memory leak suspected, restart pods

**Step 3: Temporary Mitigation**
- Increase timeout in `draft-client.ts` from 30s to 60s
- Deploy hotfix

---

#### Scenario 3: Wrong Tenant Seeing Another Tenant's Data

**Severity:** CRITICAL (data isolation breach)

**Immediate Action:**
1. Disable multi-tenancy in Supabase dashboard
2. Force all users to re-login
3. Audit logs for affected tenant IDs

**Post-Mortem Questions:**
- Was `tenantId` extracted correctly from Supabase user_metadata?
- Did API proxy pass correct `tenant_id` to backend?
- Any hardcoded tenant IDs in code?

---

### 12.3 Escalation Matrix

| Issue Type | Severity | Who to Ping | SLA |
|------------|----------|-------------|-----|
| Blank page / 500 error | P0 | @backend-lead, @devops | 15 min |
| Feature not working | P1 | @feature-owner | 1 hour |
| UI bug (cosmetic) | P2 | @frontend-lead | 4 hours |
| Performance degradation | P1 | @devops, @backend-lead | 1 hour |
| Data leak / security | P0 | @cto, @security | IMMEDIATE |

---

## 13. Development Workflow

### 13.1 Git Branch Strategy

```
main          ← Production-ready (auto-deploys)
  ├── develop     ← Staging branch (QA testing)
  │     ├── feature/intake-v2
  │     ├── feature/leverage-ui
  │     └── bugfix/sidebar-color
```

**Branch Naming:**
- `feature/<name>` — New features
- `bugfix/<name>` — Bug fixes
- `hotfix/<name>` — Production emergency fixes

---

### 13.2 Making Your First PR

**Step 1: Create Branch**
```bash
git checkout develop
git checkout -b feature/my-new-feature
```

**Step 2: Code & Commit**
```bash
git add .
git commit -m "feat: add new widget to dashboard

- Created WidgetCard component
- Added API call to fetch widget data
- Updated dashboard layout

Closes TICKET-123"
```

**Step 3: Push & Open PR**
```bash
git push origin feature/my-new-feature
# Go to GitHub → New Pull Request → base: develop
```

**PR Template:**
```markdown
## What does this change do?
Brief description

## What ticket does this resolve?
Closes TICKET-XXX

## How has this been tested?
- [ ] Unit tests added
- [ ] Manually tested in dev
- [ ] Verified on staging

## Screenshots (if UI change)
Before: ...
After: ...
```

---

### 13.3 Code Review Checklist

**Before Submitting PR:**
- [ ] No console.log statements left in code
- [ ] All TypeScript errors resolved (`npm run type-check`)
- [ ] Tailwind classes follow design system
- [ ] Accessibility checked (contrast ratios, aria-labels)
- [ ] .env.local changes documented in PR description

**Reviewing Someone Else's PR:**
- [ ] Logic makes sense for the use case
- [ ] Error handling present (try/catch, loading states)
- [ ] No hardcoded values (use env variables)
- [ ] Feature gates added if needed
- [ ] Tests cover edge cases

---

## 14. Testing Strategy

### 14.1 Types of Tests

**Unit Tests** (Jest + React Testing Library)
- Test individual components in isolation
- Example: `<StatCard value="10" title="Leads" />` renders correctly

**Integration Tests** (Playwright)
- Test full user flows across multiple pages
- Example: Login → Navigate to INTAKE → Create lead → Verify in list

**E2E Tests** (Playwright + Staging DB)
- Test against real backend services
- Example: Full lead lifecycle from intake call to settlement query

---

### 14.2 Running Tests Locally

```bash
# Unit tests
npm test

# Integration tests (headless)
npx playwright test

# E2E tests with UI
npx playwright test --ui

# Generate test report
npm run test:report
```

---

### 14.3 Writing Your First Test

**Component Test Example:**

```typescript
// tests/components/StatCard.test.tsx
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/ui/StatCard';

describe('StatCard', () => {
  it('renders value and title correctly', () => {
    render(<StatCard value="42" title="Active Leads" />);
    
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Active Leads')).toBeInTheDocument();
  });

  it('shows infinity symbol for null values', () => {
    render(<StatCard value={null} title="Validations Left" />);
    
    expect(screen.getByText('∞')).toBeInTheDocument();
  });
});
```

---

### 14.4 Test Coverage Goals

| File Type | Minimum Coverage | Critical Files |
|-----------|-----------------|----------------|
| Components | 80% | All dashboard widgets |
| Hooks | 90% | useFeatureAccess, useTenant |
| API Routes | 95% | /api/billing/*, /api/intake/* |
| Utils | 100% | All helper functions |

**Check Coverage:**
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

---

## 15. Deployment Pipeline

### 15.1 CI/CD Flow

```mermaid
graph LR
    A[Developer pushes to GitHub] --> B[GitHub Actions runs]
    B --> C{Tests pass?}
    C -->|No| D[PR blocked ❌]
    C -->|Yes| E[Merge to develop]
    E --> F[Auto-deploy to staging]
    F --> G[QA validates]
    G --> H[Merge to main]
    H --> I[Auto-deploy to production 🚀]
```

---

### 15.2 Deployment Environments

| Environment | Branch | URL | Auto-Deploy? |
|-------------|--------|-----|--------------|
| **Staging** | `develop` | https://staging.truevow.com | Yes (on merge) |
| **Production** | `main` | https://portal.truevow.com | Yes (on merge) |

---

### 15.3 Rollback Procedure

**If Production Deployment Breaks:**

```bash
# 1. Identify last known good commit
git log --oneline -10

# 2. Revert main to that commit
git checkout main
git revert --no-commit <bad-commit-hash>..<last-good-hash>
git commit -m "Rollback: Reverting problematic deployment"

# 3. Force push (triggers redeploy)
git push origin main --force-with-lease
```

**Alternative: GitHub UI**
1. Go to Actions tab
2. Find last successful deployment workflow
3. Click "Re-run jobs"

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Tenant** | A law firm (customer) with its own subscription and data |
| **INTAKE** | Lead capture & management module (Benjamin AI) |
| **TRACE** | Matter tracking, evidence management, case chronology |
| **RETAINER** | Engagement management (45 endpoints, 13 workflow states) |
| **LEVERAGE** | Retracted; legacy document compliance & case economics |
| **SETTLE** | Settlement intelligence database (query, analysis, carrier patterns) |
| **Feature Flag** | Boolean toggle controlling UI visibility per tenant (6 features) |
| **SaaS Admin DB** | Central Supabase/PostgreSQL DB for all tenant data |
| **@truevow/auth** | Shared auth library backed by Supabase (multi-tenant support) |
| **@truevow/rbac-engine** | Shared RBAC library for role-based access control |
| **API Proxy** | Next.js route that forwards requests to backend services (62 routes) |

---

## Appendix B: Useful Commands

```bash
# Start dev server
npm run dev

# Run all tests
npm test

# Type check
npm run type-check

# Build for production
npm run build

# Start production server locally
npm start

# Check for outdated dependencies
npm outdated

# Clean install (nuclear option)
rm -rf node_modules package-lock.json
npm install
```

---

## Appendix C: Who to Ask for Help

| Topic | Slack Channel | Person to Tag |
|-------|---------------|---------------|
| Authentication/Supabase | `#auth-help` | @auth-team-lead |
| Backend APIs | `#backend-dev` | @backend-architect |
| UI/UX Issues | `#frontend-dev` | @ui-tech-lead |
| DevOps/Deployments | `#devops-support` | @devops-engineer |
| General Questions | `#truevow-dev` | Anyone available |

**Golden Rule:** If stuck for >30 minutes, ask in channel with:
1. What you're trying to do
2. What you've tried so far
3. Error messages (screenshots)
4. Links to relevant code/files

---

## Appendix D: Further Reading

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [TailwindCSS Best Practices](https://tailwindcss.com/docs)
- [WCAG 2.1 AA Contrast Requirements](https://www.w3.org/WAI/GL/wiki/Contrast_(minimum))

---

**Welcome to the TrueVow team! **

If you spot anything outdated or confusing in this guide, submit a PR to update it. Documentation is a team sport.
