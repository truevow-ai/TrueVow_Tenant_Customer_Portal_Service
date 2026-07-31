# LEVERAGE Service Agent — Task List

**Date:** April 24, 2026
**Source:** Customer Portal E2E Test Results
**Priority:** HIGH — These gaps block attorney-facing features from working

---

## Background

The Customer Portal team has built a complete LEVERAGE frontend with:
- Real-time Damages Calculator (works without backend)
- Real-time Disbursement Calculator (works without backend)
- Case Management with lead conversion
- Rewards tracking
- Analytics dashboard
- Document validation & deadlines (existing DRAFT features)

**E2E Test Result:** The calculators work perfectly. But all data-dependent features are broken because the backend returns empty data or missing endpoints.

---

## Task 1: Fix `/leverage/cases` — Return Actual Case Data

**Problem:** Returns `[]` (empty array). Cases table stuck in "Loading..." forever.

**Expected Response:**
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

**Action:** Query the cases table by `tenant_id`. Return wrapped in `{ cases: [...], total, page, limit }`.

---

## Task 2: Fix `/leverage/rewards/summary` — Return Actual Summary

**Problem:** Returns `{}` (empty object). Rewards cards show "—" dashes.

**Expected Response:**
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

**Action:** Aggregate reward transactions by `tenant_id`. Count active, used, expired. Find next expiration.

---

## Task 3: Fix `/leverage/rewards/ledger` — Return Actual Transactions

**Problem:** Returns `[]` (empty array). Transaction history table stuck in "Loading...".

**Expected Response:**
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

**Action:** Query reward transactions by `tenant_id`. Return wrapped in `{ transactions: [...], total }`.

---

## Task 4: Create `/leverage/analytics` — LEVERAGE-Specific Metrics

**Problem:** Endpoint does not exist. Portal falls back to `/draft/analytics` which shows validation data only.

**Expected Response:**
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
  "compliance_health_score": 78,
  "timeline": [
    { "date": "2026-04-01", "validations": 12, "cases_opened": 3 },
    { "date": "2026-04-02", "validations": 8, "cases_opened": 1 }
  ],
  "by_practice_area": [
    { "practice_area": "Personal Injury", "count": 25, "avg_value": 95000 },
    { "practice_area": "Employment Law", "count": 10, "avg_value": 45000 }
  ],
  "by_document_type": [
    { "document_type": "Complaint", "count": 40 },
    { "document_type": "Demand Letter", "count": 30 }
  ]
}
```

**Action:** Create new endpoint. Aggregate from cases, validations, rewards tables filtered by `tenant_id`.

---

## Task 5: Create Deadline Endpoints

**Problem:** Do not exist. Portal deadline routes return empty data with 503.

**Required Endpoints:**
- `GET /leverage/case/{case_id}/deadlines` — List deadlines for a case
- `POST /leverage/case/{case_id}/deadlines/save` — Save a deadline
- `GET /leverage/deadlines/upcoming?tenant_id=...&days=30` — Upcoming deadlines across cases

**DeadlineItem Schema:**
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

**Action:** Create `app/api/v1/endpoints/leverage_deadlines.py`. Use existing deadline calculation logic from DRAFT service.

---

## Task 6: Update `CaseOpenRequest` Schema

**Problem:** Portal sends `{ tenant_id, incident_type, state, litigation_stage }` but backend expects `{ tenant_id, case_id, user_id, signals, is_first_case }` with `case_id` as REQUIRED.

**Portal Payload:**
```json
{
  "tenant_id": "...",
  "incident_type": "Motor Vehicle Accident",
  "state": "CA",
  "litigation_stage": "lead"
}
```

**Fix:**
1. Make `case_id` OPTIONAL in `CaseOpenRequest`
2. Auto-generate UUID if `case_id` not provided
3. Accept `incident_type`, `state`, `litigation_stage` as top-level fields
4. Map them into internal `CaseSignals` or case profile
5. Return the created case including generated `case_id`

**Optional Enhancement:** Accept `signals` field with `lead_id` for INTAKE lead-to-case traceability.

---

## Acceptance Criteria

After completing these tasks, the Customer Portal team will re-run the E2E test and expect:

| Feature | Current | Expected After Fix |
|---------|---------|-------------------|
| Cases list | "Loading..." forever | Shows actual cases |
| Rewards summary | "—" dashes | Shows active/total/used/expired |
| Rewards history | "Loading..." | Shows transaction rows |
| Analytics | "—" dashes, no chart | Shows stats + bar chart |
| Deadlines | Empty | Shows calculated deadlines |
| New case | May fail | Creates case successfully |

---

## Files to Reference in Customer Portal

- `LEVERAGE_BACKEND_INSTRUCTIONS.md` — Full specification with schema details
- `LEVERAGE_PORTAL_FRONTEND_COMPLETE.md` — What frontend expects from backend
- `app/api/leverage/*` — Portal's API proxy routes (show exact request/response flow)

## Contact

If schema questions arise, check the portal's proxy routes in `app/api/leverage/*/route.ts` files — they document exactly what the frontend sends and expects.
