# Customer Portal — Coding Agent Operating Instructions
## Read This Before Writing a Single Line of Code

**Version:** 1.0
**Date:** July 2026
**Classification:** Engineering — Required Reading
**Service:** TrueVow Customer Portal — the law firm dashboard for INTAKE, LEVERAGE, SETTLE, and VERIFY
**Trust domain:** TENANTS (Clerk App 3 "TrueVow-Tenants") — external, tenant-scoped
**Prerequisite:** Customer Portal PRD, the platform AGENTS.md, ADR-000 (Clerk over Auth0)

> This document is the operating standard for every line of code in the Customer Portal. It is not a set of guidelines. Any deviation requires explicit justification in the PR description and sign-off from the product owner.

---

## The One Thing That Matters Most

The person the Customer Portal serves is **a solo PI attorney or paralegal** who is running a small firm. They have 40 open cases, a stack of demands to write, and a client waiting on a callback. They did not go to engineering school. They do not want to learn your dashboard — they want to open it, see their leads, validate a document, estimate a settlement range, and get back to their client. **Every second spent deciphering your UI, recovering from your logout, or wondering where their data went is a second stolen from someone who bills by the hour and whose client is in pain.**

If a Clerk tenant-ID mapping bug shows one firm another firm's leads, you have committed a catastrophic data breach — PHI from injured people is now in the wrong hands. If a subscription gate fails open and gives unpaid access, you have stolen revenue from the platform. If a token-refresh failure silently logs the attorney out mid-work and they lose unsaved state, you have destroyed trust in the product. If a sensitive lead's injury details render in a client component and leak to browser devtools or extensions, you have exposed PHI to anyone who opens F12.

The second person the portal serves is **the injured client whose data is passing through this dashboard.** That person did not consent to their injury details appearing in another firm's screen, a browser extension, or a JavaScript error log. Their PHI is the portal's highest-stakes cargo, and every byte of rendering logic must honor that.

Everything below exists because breaking it eventually hurts one of those two people.

---

## Part 0 — What the Customer Portal Is (So You Don't Break It)

The Customer Portal is a **frontend-only Next.js 14 App Router application.** It has no local database, no backend, and no direct database access. It calls the Platform API and individual Tenant service APIs (INTAKE, LEVERAGE, SETTLE, VERIFY) via Axios. It consumes `@truevow/auth-client` (which wraps Clerk) and `@truevow/rbac-engine` for role-based access control.

The defining architectural fact: **the portal is a thin, server-rendered shell that delegates all authorization and data access to the backend.** The portal never decides who can see what — the backend does. The portal's job is to present backend-authorized data clearly and safely, using React Query for server-state caching, Zustand for local UI state, and server components anywhere sensitive data is rendered.

Four constraints are non-negotiable:
1. **Authorization is always server-verified.** Never trust a client-side role, subscription flag, or tenant ID to gate access. The backend is the authority.
2. **Sensitive data renders server-side.** Lead contact info, injury details, settlement figures, and any PHI/PII must be fetched and rendered in React Server Components — never in a client component where it lands in the browser's JavaScript bundle, devtools, or extension surface.
3. **Subscription gating must fail closed.** If the `hasServiceAccess` check is missing, indeterminate, or erroring, the service tile is hidden, not shown.
4. **Tenant isolation is absolute.** No request to any backend service lacks the tenant/firm scope. The portal must never construct a request that could cross tenant boundaries.

---

## Part 1 — Build Philosophy

### 1.1 Boring is a Feature
Do not adopt Next.js 15 canary features, experimental React patterns, or bleeding-edge state libraries. Use Next.js 14 App Router in its stable, documented configuration. Use Tailwind CSS as configured. Use TanStack React Query for server state because it is the standard, not because it is novel. **The test:** would a Next.js developer hired next week recognize this codebase in an hour? If no, simplify.

### 1.2 Simple is Not Simplistic
Simple code means: one component does one job, server components handle data fetching and pass derived props down, client components handle interactivity and nothing else, names say what they contain, no nested ternaries deeper than two levels. **Paralegal test:** can a non-technical person look at a component's loading state, error state, and empty state and understand what happened and what to do next? If not, rewrite the copy and flow.

### 1.3 No Business Logic in Components
Components call hooks. Hooks call API-client functions. API-client functions call Axios. That is the only data-flow path. A `page.tsx` that contains `await fetch(...)` inside a `useEffect` with inline error handling is wrong. A server component that fetches via a dedicated `lib/api` function, handles errors at the boundary, and passes typed data to a presentational sub-component is right.

### 1.4 No Premature Abstractions
The `@truevow/auth-client` abstraction exists because it wraps Clerk and provides a normalized `AuthContext` — that earns its keep. Everything else: build the simplest thing that works today. Do not create a "reusable Card component" that takes 14 props before you have built three cards. Write the code twice before you abstract it.

### 1.5 The Attorney is Always Right About Their Experience
If a real attorney would be confused by a label, frustrated by a missing back-button, or alarmed by an error message that reads like a terminal log, the behavior is wrong — even if it is technically correct. When unsure, ask: *what would a busy, non-technical PI attorney expect to see here?* Build that.

---

## Part 2 — Code Quality Rules (Non-Negotiable)

### 2.1 Every Component Does One Thing
A component that handles loading, error, empty, AND populated state in one file is four components waiting to be extracted. One component per concern. Max file length is ~200 lines including imports. Split aggressively.

### 2.2 Name Everything Like a Sentence
`LeadTable` not `Tbl`. `useSubscriptionAccess` not `useSub`. Never single-letter names. Never `data`, `result`, `info`, `obj`, `thing`, or `stuff`. A variable called `data` in a settlement estimate component is undebuggable six months later.

### 2.3 Type Everything — Strict Mode is Not Optional
`tsconfig.json` has `"strict": true`. Never use `any` in new code. Never use `as` casts to silence the compiler. Every API response has an explicit interface. Every React Query hook has an explicit return type. Run `npm run type-check` before every PR. A type error is a bug waiting to surface in production.

### 2.4 Handle Every State — Loading, Empty, Error, Edge
Every data-fetching view must handle at least four states: **Loading** (skeleton, not a blank page), **Empty** ("You have no leads yet. When a potential client calls, they will appear here." — not "No data" or a blank table), **Error** ("We could not load your leads right now. Please try again or contact support@truevow.law." — not "Error 500" or a JSON dump), and **Populated** (the actual data). A view that shows a white screen while fetching is broken.

### 2.5 No Bare `try/catch` — Every Error Becomes a Human Message
```typescript
// Wrong — the user sees "Something went wrong" or nothing at all
try {
  const leads = await getLeads(tenantId);
} catch (e) {
  setError("Something went wrong");
}

// Right — specific, actionable, never exposes internals
try {
  const leads = await getLeads(tenantId);
} catch (e) {
  if (e instanceof ApiError && e.status === 403) {
    setError("You do not have access to this section. If you believe this is a mistake, contact your firm administrator.");
  } else {
    setError("We could not load your leads right now. Please refresh the page or contact support@truevow.law.");
  }
  logger.error("Failed to load leads", { tenantId, errorCode: (e as ApiError)?.code });
  // Never log lead names, phone numbers, or injury details here
}
```

### 2.6 ESLint is Not a Suggestion
Run `npm run lint` before every PR. No `// eslint-disable` without an explicit comment explaining why and sign-off on the PR. Zero warnings on `main`.

### 2.7 API Contract Discipline
The frontend never invents fields, assumes response shapes, or falls back to a "reasonable default" when the backend changes. Every API response type is explicit. If the backend adds a field, the frontend type is updated in the same PR. A breaking contract change in the backend must fail the frontend build, not silently degrade at runtime.

### 2.8 Write the Test Before You Think You're Done
Critical paths have tests: subscription-gating logic, tenant-ID scoping on API calls, error-boundary recovery, empty-state rendering, and the full E2E login-to-dashboard flow. The project already uses Playwright. Coverage targets: rendering-critical components at 80%+, subscription/auth logic at 95%+.

---

## Part 3 — Architecture Rules (Non-Negotiable)

### 3.1 File Layout Mirrors Routes
`app/(dashboard)/dashboard/intake/leads/page.tsx` serves `/dashboard/intake/leads`. Components live in `components/` organized by domain. Hooks in `hooks/`. API client functions in `lib/api/`. Shared types in `shared/`. Do not put API logic in a component file or component JSX in `lib/`.

### 3.2 Server Components for Sensitive Data, Client Components for Interactivity
This is the most important architectural rule in the portal. **Any component that renders PHI/PII — lead names, phone numbers, email addresses, injury details, settlement figures — must be a React Server Component.** The data must be fetched server-side and rendered into HTML before it reaches the browser. Client components handle clicks, form inputs, modals, and toggles — never raw PHI payloads.

```typescript
// Right — LeadName is a server component; PHI never touches the client bundle
// app/(dashboard)/dashboard/intake/leads/page.tsx (Server Component)
export default async function LeadsPage() {
  const { firmId } = await getAuthContext(); // server-side auth
  const leads = await getLeads(firmId);      // server-side fetch
  return <LeadList leads={leads} />;
}

// Wrong — client component fetches leads with PHI into browser memory
"use client";
function LeadsPage() {
  const { data } = useQuery({ queryKey: ["leads"], queryFn: () => getLeads(tenantId) });
  // Every lead name, phone, and injury detail is now in the client bundle and devtools
}
```

### 3.3 React Query for Server State, Zustand for Local UI State
API-fetched data belongs in React Query (server state). Sidebar collapsed/expanded, modal open/closed, filter toggles belong in Zustand (local UI state). Never put server data in Zustand. Never put a `useQuery` result into a global store.

### 3.4 The API Client is the Single Source of Backend Communication
Every backend call goes through a typed function in `lib/api/`. No `fetch()` or `axios.get()` ad-hoc in a component. The API client attaches the auth token, injects the tenant scope, and normalizes errors. A component that calls Axios directly has bypassed auth, scoping, and error normalization.

### 3.5 Never Trust Client State for Authorization
A Zustand store that says `isAdmin: true` is a UI affordance, not a security decision. The backend must reject an unauthorized request regardless of what the client believes. The frontend must never show/hide a feature based solely on a client-stored flag — it must verify against the backend response.

### 3.6 Subscription Gating Must Fail Closed
The `hasServiceAccess(service: string)` check gates every service tile and page. If the check returns `false`, the service is hidden. If the check **throws or times out**, the service is **hidden**, not shown. A failing-open gate is a revenue leak and a trust breach. The gate must be checked server-side in the layout or page component, not in a client `useEffect`.

### 3.7 Environment Variables Are the Only Configuration
No hardcoded API URLs, Clerk keys, or feature flags. Every value that differs between environments lives in `.env.local` (never committed) with a placeholder in `.env.example` (committed, kept current). `NEXT_PUBLIC_` prefix only for values that are genuinely safe in the browser. Never prefix a secret with `NEXT_PUBLIC_`.

### 3.8 Auth — Consume `@truevow/auth-client`, Never Import Clerk Directly
Clerk (App 3 "TrueVow-Tenants") is the platform-wide auth standard. The Portal consumes the shared `@truevow/auth-client` (`ClerkWrapper`) — it never imports `@clerk/nextjs` directly. The auth client normalizes Clerk session claims into a typed `AuthContext(userId, firmId, role, permissions)`. **Every page, layout, and API call consumes `AuthContext`, never a raw Clerk session or JWT field.** The `middleware.ts` file uses the auth-client provider to protect routes. Why: the portal stays testable (mock `AuthContext`), intent stays readable, and any Clerk API change is isolated to one client library.

### 3.9 Observability Is Part of the Feature
The Portal ships OpenTelemetry instrumentation and Sentry. Every page navigation, every API call failure, every auth error emits a span or event. Sentry captures frontend exceptions with `firmId` and `userId` as tags — never with lead names, phone numbers, or document content. Do not let Sentry capture PII in breadcrumbs or error contexts.

---

## Part 4 — Data Protection & Compliance (Zero Tolerance)

### 4.1 PHI/PII Never Renders in Client Components
Lead names, phone numbers, email addresses, home addresses, injury types, accident dates, treatment status, settlement figures — all PHI/PII — must be fetched and rendered in React Server Components. Client components receive only opaque IDs, sanitized summaries, or UI state. A `"use client"` file that contains `lead.phone` or `lead.injuryDescription` is a bug that exposes PHI to every browser extension, devtools session, and client-side error-logging service.

### 4.2 PHI/PII Never Appears in Client-Side Logs or Error Reports
Sentry, console.log, and any client-side telemetry must never contain lead PII. **Always log:** `leadId`, `firmId`, `errorCode`, `endpoint`. **Never log:** lead name, phone, email, address, injury details, or any transcript content.

### 4.3 Secrets Never Ship to the Browser
No API key, secret, or token except the Clerk publishable key (which is designed to be public) may be prefixed with `NEXT_PUBLIC_`. All server-side secrets use non-public env vars and are only accessible in server components, route handlers, and middleware. A secret in the client bundle is a secret published to the world.

### 4.4 Tenant Isolation Is Absolute — Never Cross Scopes
Every API request must carry the tenant/firm scope. The portal must never construct a request URL, query param, or body that could return another firm's data. The backend enforces this at three layers (query scoping, AuthContext validation, Supabase RLS), but the portal must never create a situation where a bug in one of those layers could be exploited. Build the API client so it is physically impossible to omit the tenant ID from a scoped request.

### 4.5 Never Derive Authorization from the URL
A page at `/dashboard/intake/leads/{leadId}` must verify server-side that `leadId` belongs to the authenticated firm before rendering. A manually-crafted URL must not bypass scoping. The backend rejects unauthorized requests; the portal's routing must never assume URL parameters are pre-authorized.

---

## Part 5 — The Attorney Experience (This Is the Product)

### 5.1 Every Screen Answers "What Do I Do Now?"
The dashboard home must tell the attorney what is new, what needs attention, and where to go next. An empty leads page must explain why it is empty ("When a potential client calls INTAKE and completes the interview, their lead will appear here") and offer a next action. A loading state must show a skeleton, not a white flash. An error state must say what went wrong in plain English with a support contact.

### 5.2 Navigation Must Be Obvious and Fast
The sidebar shows the services the firm subscribes to. Services they do not subscribe to are not shown at all — not greyed out with a "ask your admin to enable this" tooltip. Navigation between pages must feel instant (React Query caching, `loading.tsx` boundaries per route segment). A full-page spinner on every navigation is a broken experience.

### 5.3 Errors the Attorney Sees Are Written for a Non-Technical Person
Error and empty states are plain English with a next action and a support contact — never HTTP codes, stack traces, "null", "undefined", "NetworkError", "403 Forbidden", or JSON. Every empty state explains **why** it is empty and **what** to do next.

### 5.4 Logout Must Be Graceful
A token-refresh failure must not lose the attorney's place, wipe their form input, or show a cryptic white screen. The portal must attempt a silent refresh; if that fails, it must redirect to sign-in with a clear message ("Your session expired. Please sign in again.") and preserve the return URL so they land back where they were.

### 5.5 Forms Must Survive a Refresh
Any form with more than two fields must persist its state (localStorage or sessionStorage) so a page refresh, accidental back-navigation, or session expiry does not destroy the attorney's work.

---

## Part 6 — Code Review Standards

### 6.1 The PR Description Is Part of the Code
Every PR states: what changed (plain English), why (link to spec/issue), how to test it manually (step by step), and any risks. "Fixed the dashboard bug" is not mergeable.

### 6.2 Four-Eyes Rule for High-Stakes Code
Explicit second-reviewer sign-off — a comment confirming the specific concern was checked — is required for any change that:
- modifies **auth, tenant scoping, or subscription gating**,
- touches the **API client** (`lib/api/`),
- changes how **PHI/PII is rendered** (server vs. client component boundary),
- modifies **middleware** or the auth-client integration,
- adds a new **data-fetching pattern** that could leak tenant scope.

### 6.3 Server Components Must Stay Server Components
No PR may move a PHI-rendering component from server to client without an explicit security review. A reviewer must confirm that the component renders no PII before approving the `"use client"` directive.

### 6.4 No Dead Code
No commented-out code, no unused imports, no TODOs older than a sprint. The only allowed marker is `// AGENT CHOICE: [description] — flagged for review`, to be resolved next sprint.

---

## Part 7 — Deployment Rules

### 7.1 Production Is Sacred
Production is where real attorneys view real leads with real PHI. Pipeline: merge to `main` → auto-deploy to staging → full E2E test suite → manual, signed-off production deploy, logged (who/when/what). No production deploys on Friday afternoon. No production deploy that has not run in staging.

### 7.2 Secrets Never Touch Git
Vercel environment variables for production, `.env.local` for dev, `.env.example` (placeholders only) in git. If a secret is ever committed: rotate it first, then scrub history, then notify the team.

### 7.3 Rollback Must Be Possible Immediately
Vercel instant rollback is the recovery path. Every deploy must be verified on production within 2 minutes of going live — verify the dashboard loads, leads render, and no white screen of death.

---

## Part 8 — The Simplicity Test

Before marking any work complete, run it through these:

1. **Would a Next.js developer joining today understand this component tree in 30 minutes without asking anyone?** If no: simplify or document until yes.
2. **Does a non-technical PI attorney know what to do on every screen — loading, empty, error, populated?** If no: fix the copy and flow.
3. **Could any PHI/PII render in a client component, appear in a console.log, or leak to Sentry?** If yes: fix before merging.
4. **Could a Clerk tenant-ID bug or a missing scope filter show one firm's data to another?** If yes: architect so it cannot.
5. **If a token refresh fails mid-session, does the attorney lose their work or just need to sign in again?** If they lose work: persist state first.

---

## Report to the Orchestrator — Mandatory Session Protocol

You are not working alone. This service reports to the TrueVow CTO Orchestrator, whose **only** real-time visibility into your work comes from two channels: your **git state** and your **check-ins**. If you never check in, the orchestrator dashboard shows this service as `NEGLECTED`, the CTO is flying blind, and stalled or half-finished work stays invisible.

A task is not "done" until the check-in is posted. **Intent is not completion.**

**Start of every session:**
```
python ../TrueVow_Shared_Orchestration/orchestrator.py sync-memory
python ../TrueVow_Shared_Orchestration/orchestrator.py scan-services
python ../TrueVow_Shared_Orchestration/orchestrator.py agent-checkin start "Customer Portal: <task> | resuming from <state> | goal: <what success looks like>"
```

**During work — record decisions as they happen:**
```
python ../TrueVow_Shared_Orchestration/memory.py remember <category> "<title>" "<content>" --importance N
```

**End of session — write back, then push:**
```
python ../TrueVow_Shared_Orchestration/orchestrator.py agent-checkin done "Customer Portal: <accomplished> | outcome: <result> | learned: <insight> | next: <remaining>" --status DONE
python ../TrueVow_Shared_Orchestration/orchestrator.py push-memory
```

**If blocked — raise it immediately, never go silent:**
```
python ../TrueVow_Shared_Orchestration/orchestrator.py agent-checkin blocked "Customer Portal: <blocker> | attempted: <what you tried> | need: <what unblocks you>"
```

**RULE 0 — No fabrication.** Never report a build, a test count, or a metric you did not actually produce. If a command did not run green in front of you, it is not green. A stub result is not a real result. Binding platform-wide.

---

## The Final Instruction

You are not building a web dashboard. You are building the command center for a solo PI attorney who took out loans to start their own firm, who works 60-hour weeks, and whose clients are injured people depending on a settlement to pay medical bills and keep their homes. Whether that attorney finds their leads quickly, trusts the data they see, and never accidentally sees another firm's client information — that all depends on whether your code rendered the right component in the right place, never leaked PHI to the wrong place, and never failed silently in the worst possible place.

The code you write is the difference between an attorney who gets through their day and gets back to their clients — and an attorney who loses an afternoon fighting your dashboard, or worse, loses trust that their client data is safe with TrueVow.

Write code like it matters. Because it does.

---

*These instructions apply to every line of code written for the Customer Portal. They are the operating standard, not guidelines. Any deviation requires explicit justification in the PR description and product-owner sign-off.*

*Last updated: July 2026*
