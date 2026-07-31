# Instructions for LEVERAGE Service Coding Agent

## Context: Customer Portal Integration

The Customer Portal team has built the frontend UI and API proxy routes to consume the LEVERAGE service backend. This document outlines what the portal expects from the LEVERAGE backend and identifies any gaps that require backend implementation.

---

## What Exists (Working Endpoints)

The following LEVERAGE backend endpoints are already implemented and working with the Customer Portal:

| Endpoint | Method | Status | Portal Usage |
|----------|--------|--------|-------------|
| `/leverage/damages` | POST | ✅ | Damages calculator (stateless) |
| `/leverage/disbursement` | POST | ✅ | Disbursement calculator (stateless) |
| `/leverage/case/open` | POST | ✅ | Open new case ($79 charge) |
| `/leverage/cases` | GET | ⚠️ | List all cases for tenant — **returns empty** (see Gap #4) |
| `/leverage/case/{id}/detail` | GET | ✅ | Combined case detail view |
| `/leverage/case/{id}/events` | GET | ✅ | Case timeline / activity feed |
| `/leverage/case/{id}/economics` | GET | ✅ | Merged damages + disbursement |
| `/leverage/case/{id}/damages` | GET | ✅ | Retrieve saved damages worksheets |
| `/leverage/case/{id}/damages/save` | POST | ✅ | Save damages worksheet (versioned) |
| `/leverage/case/{id}/disbursement` | GET | ✅ | Retrieve saved disbursement worksheets |
| `/leverage/case/{id}/disbursement/save` | POST | ✅ | Save disbursement worksheet (versioned) |
| `/leverage/rewards/ledger` | GET | ⚠️ | Full reward transaction history — **returns empty** (see Gap #5) |
| `/leverage/rewards/summary` | GET | ⚠️ | Enriched reward balance — **returns empty** (see Gap #5) |
| `/leverage/rewards/balance` | GET | ✅ | Active credit count |

---

## E2E Test Findings (April 24, 2026)

The Customer Portal team ran a full attorney-level walkthrough. The **damages calculator, disbursement calculator, and new case form all work perfectly** with real-time local calculation. However, the following backend-dependent features are blocked:

| Feature | Issue | Root Cause |
|---------|-------|------------|
| Cases list table | Stuck in "Loading..." forever | `/leverage/cases` returns empty list `[]` |
| Rewards summary | All cards show "—" (dashes) | `/leverage/rewards/summary` returns empty object `{}` |
| Rewards history | Table stuck in "Loading..." | `/leverage/rewards/ledger` returns empty list `[]` |
| Analytics page | All stats show "—", no chart | `/leverage/analytics` does not exist (falls back to `/draft/analytics`) |
| Deadlines section | Empty | Deadline endpoints do not exist |
| Case creation | May fail | `CaseOpenRequest` schema mismatch |

---

## Backend Gaps Requiring Implementation

### 1. LEVERAGE-Specific Analytics Endpoint

**Current State:** The portal calls `/api/v1/draft/analytics` which returns document validation analytics (total_validations, success_rate, by_document_type, by_practice_area, timeline). This is DRAFT data, not LEVERAGE case data.

**Required:** A new `/leverage/analytics` endpoint that returns LEVERAGE-specific metrics:

```json
{
  "total_cases": 42,
  "active_cases": 18,
  "settled_cases": 5,
  "total_compliance_runs": 120,
  "average_compliance_flags": 2.3,
  "total_reward_credits_granted": 22,
  "total_reward_credits_used": 15,
  "total_reward_credits_expired": 3,
  "active_reward_credits": 4,
  "total_damages_calculated": 1450000,
  "average_case_value": 85000,
  "compliance_health_score": 78
}
```

**Where to add:** `app/api/v1/endpoints/leverage_analytics.py` (new file) or extend `leverage_case.py`.

### 2. Case Deadline Endpoints

**Current State:** The portal has proxy routes for deadlines but the backend endpoints do not exist under the LEVERAGE namespace.

**Required:** 
- `GET /leverage/case/{case_id}/deadlines` — Return deadlines for a specific case (SOL, demand letter, etc.)
- `POST /leverage/case/{case_id}/deadlines/save` — Save a deadline to a case
- `GET /leverage/deadlines/upcoming?tenant_id=...&days=30` — Return upcoming deadlines across all cases

**Suggested schema for DeadlineItem:**
```json
{
  "id": "uuid",
  "case_id": "uuid",
  "tenant_id": "uuid",
  "deadline_type": "sol | eeoc | demand_letter | right_to_sue | discovery | mediation | trial",
  "deadline_date": "2026-05-15",
  "days_remaining": 21,
  "source_state": "FL",
  "description": "Statute of limitations expires",
  "calculation_input_json": {},
  "created_at": "2026-04-01T10:00:00Z"
}
```

**Where to add:** `app/api/v1/endpoints/leverage_deadlines.py` (new file).

### 3. OpenCaseRequest Schema Alignment

**Current State:** The portal sends:
```json
{
  "tenant_id": "...",
  "incident_type": "Motor Vehicle Accident",
  "state": "CA",
  "litigation_stage": "lead"
}
```

But the backend `CaseOpenRequest` in `leverage_case.py` expects:
```python
class CaseOpenRequest(BaseModel):
    tenant_id: str
    case_id: UUID             # Required — issued by MDM
    user_id: Optional[str]
    signals: Optional[CaseSignals]
    is_first_case: bool
```

**Issue:** The portal does not generate a `case_id` UUID. The backend either needs to:
- Accept `case_id` as optional and generate one internally, OR
- Accept the simpler schema the portal sends and create the case profile from it

**Recommendation:** Make `case_id` optional in `CaseOpenRequest` and auto-generate a UUID if not provided. Map `incident_type` and `state` into `CaseSignals` internally.

---

## Lead-to-Case Conversion Context

The Customer Portal has added a **lead-to-case conversion flow**:

1. Attorney views INTAKE leads in the portal (`/api/intake/leads`)
2. Attorney clicks "Convert from Lead" on the LEVERAGE Cases page
3. Portal pre-populates the case creation form with lead data:
   - `practice_area_code` → mapped to `incident_type`
   - Lead answers (if state/location question exists) → mapped to `state`
   - Lead status (`retained` → `retained`, `scheduled` → `consult_scheduled`, else `lead`)
4. Attorney reviews and submits
5. Portal calls `POST /leverage/case/open`

**What the backend should know:** The `signals` field in `CaseOpenRequest` is the ideal place to store the original intake data (lead_id, practice_area, caller info) for audit/traceability.

---

## Files the Portal Team Modified (for reference)

### New Portal Files (Frontend)
- `app/(dashboard)/dashboard/leverage/rewards/page.tsx`
- `app/(dashboard)/dashboard/leverage/damages/page.tsx`
- `app/(dashboard)/dashboard/leverage/disbursement/page.tsx`
- `app/(dashboard)/dashboard/leverage/cases/page.tsx`
- `app/(dashboard)/dashboard/leverage/cases/new/page.tsx`
- `app/(dashboard)/dashboard/leverage/cases/[caseId]/page.tsx`
- `app/(dashboard)/dashboard/leverage/analytics/page.tsx`

### New Portal Files (API Proxy Routes)
- `app/api/leverage/rewards/ledger/route.ts`
- `app/api/leverage/rewards/summary/route.ts`
- `app/api/leverage/case/[caseId]/damages/save/route.ts`
- `app/api/leverage/case/[caseId]/damages/route.ts`
- `app/api/leverage/case/[caseId]/disbursement/save/route.ts`
- `app/api/leverage/case/[caseId]/disbursement/route.ts`
- `app/api/leverage/cases/route.ts`
- `app/api/leverage/case/[caseId]/events/route.ts`
- `app/api/leverage/case/[caseId]/detail/route.ts`
- `app/api/leverage/case/open/route.ts`
- `app/api/leverage/case/[caseId]/deadlines/save/route.ts` *(no backend yet)*
- `app/api/leverage/case/[caseId]/deadlines/route.ts` *(no backend yet)*
- `app/api/leverage/deadlines/upcoming/route.ts` *(no backend yet)*
- `app/api/leverage/case/[caseId]/economics/route.ts`
- `app/api/leverage/analytics/route.ts` *(calls /draft/analytics as fallback)*

### Modified Portal Files
- `lib/api/leverage-client.ts` — API client for all LEVERAGE endpoints
- `app/(dashboard)/dashboard/leverage/page.tsx` — Landing page with stat cards
- `middleware.ts` — Added `?preview=bypass` auth bypass for dev
- `app/(dashboard)/layout.tsx` — Shows LEVERAGE nav during preview bypass

---

### 4. Cases Endpoint — Return Actual Data

**Current State:** `/leverage/cases` returns `[]` (empty array). The portal's case table is stuck in "Loading..." because it expects a non-empty response structure.

**Required Response:**
```json
{
  "cases": [
    {
      "case_id": "uuid",
      "tenant_id": "uuid",
      "incident_type": "Motor Vehicle Accident",
      "state": "CA",
      "status": "active",
      "litigation_stage": "lead",
      "leverage_unlocked": true,
      "latest_compliance": "2026-04-20T10:00:00Z",
      "created_at": "2026-04-01T10:00:00Z",
      "updated_at": "2026-04-20T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

**Fix:** Ensure the endpoint queries the cases table and returns actual records filtered by `tenant_id`.

### 5. Rewards Endpoints — Return Actual Data

**Current State:** Both `/leverage/rewards/summary` and `/leverage/rewards/ledger` return empty data.

**Required for `/leverage/rewards/summary`:**
```json
{
  "active_credits": 4,
  "total_granted": 22,
  "total_used": 15,
  "total_expired": 3,
  "next_expiration_date": "2026-05-15",
  "next_expiration_amount": 2
}
```

**Required for `/leverage/rewards/ledger`:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "case_id": "uuid",
      "source": "case_settlement | welcome_bonus | referral | manual_grant",
      "credits": 5,
      "status": "active | used | expired",
      "created_at": "2026-04-01T10:00:00Z",
      "expires_at": "2026-07-01T10:00:00Z",
      "used_at": null,
      "used_for_case_id": null
    }
  ],
  "total": 1
}
```

**Fix:** Ensure these endpoints query the rewards/ledger tables and return actual records filtered by `tenant_id`.

---

## Summary of What LEVERAGE Agent Should Do (Priority Order)

1. **Fix `/leverage/cases`** — Return actual case data filtered by tenant (currently returns `[]`)
2. **Fix `/leverage/rewards/summary`** — Return actual reward summary (currently returns `{}`)
3. **Fix `/leverage/rewards/ledger`** — Return actual transaction history (currently returns `[]`)
4. **Create `/leverage/analytics`** — Return LEVERAGE-specific case/economics/rewards metrics
5. **Create deadline endpoints** (`/case/{id}/deadlines`, `/deadlines/upcoming`, save)
6. **Update `CaseOpenRequest`** — Accept simpler portal schema (auto-generate case_id if missing)
7. **Optional:** Accept `signals` with lead metadata during case open for traceability
