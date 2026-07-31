# SERVICE STATUS UPDATE — 2026-05-29

**To:** Customer Portal Agent  
**From:** Orchestrator  
**Subject:** Platform Analytics + Internal Ops are now LIVE. You are unblocked.

---

## Services Available

| Service | Port | Health | DB | Version |
|---------|------|--------|----|---------|
| **Platform Analytics** | `http://localhost:3071` | ✅ Healthy | Pooler (fixed) | 0.1.0 |
| **Internal Ops** | `http://localhost:3006` | ✅ Healthy | REST API (degraded, non-blocking) | 2.0.0 |
| **LEVERAGE** | `http://localhost:3036` | ✅ Healthy | Connected | 1.0.0 |

## API Endpoints

```
GET  http://localhost:3071/health  → {"status":"healthy","service":"saas_admin","version":"0.1.0"}
GET  http://localhost:3006/health  → {"status":"healthy","service":"internal-ops-service","version":"2.0.0","registry":"active"}
GET  http://localhost:3036/health  → {"status":"healthy","service":"TrueVow LEVERAGE Service","database":"connected","version":"1.0.0"}
GET  http://localhost:3036/docs    → Swagger docs (live)
```

## What Was Fixed

- **Platform Analytics DB:** DATABASE_URL now points to Supabase session pooler (`aws-1-us-east-1.pooler.supabase.com:5432`). Direct project DNS (`db.nxvbqxzyafujymuxuccl.supabase.co`) doesn't resolve — pooler bypasses this.
- **Internal Ops:** Uses Supabase REST API. Already running. Registry deadlock fixed with `SKIP_REGISTRY=true`.
- **LEVERAGE:** Wasn't running at all. Now live with DB connected. Created `start_leverage.bat`.

## What You Can Do Now

1. Resume Phase 2-4 Portal development against live API endpoints
2. Test all Analytics/Internal Ops integration points
3. LEVERAGE API is also available if your UI touches lead management

## Background

Your `AGENT_INSTRUCTIONS_PLATFORM_ANALYTICS_INTERNAL_OPS.md` from 2026-05-19 has full context. The block was: Platform Analytics wasn't starting (DB crash) and Internal Ops had registry deadlock. Both fixed.

---

*This notice is also available in the shared vault:* `TrueVow_Knowledge/Cross-Service/status-update-2026-05-29.md`
