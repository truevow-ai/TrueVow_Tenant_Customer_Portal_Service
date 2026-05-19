# Platform Analytics & Internal Ops Agent Instructions

**Date:** 2026-05-19  
**Target Agents:** Platform Analytics Service (port 3071), Internal Ops Service (port 3006)  
**Source:** Customer Portal Agent (Truevow_Tenant_Customer_Portal_Service)

---

## 1. Three-Mode Workflow Implementation

### Overview
All agents must follow the three-mode workflow for every feature implementation:

```
ARCHITECT (Plan) → CODER (Build) → QA (Validate) → COMMIT
```

### Mode 1: Architect Agent
**Role:** Plan first, validate against architecture, create implementation specs

**Responsibilities:**
1. **Read existing architecture documents** before planning:
   - `ARCHITECTURE_DECISION.md`
   - `COMPLETE_CUSTOMER_PORTAL_FEATURES.md`
   - Service-specific documentation in `docs/`
2. **Create implementation plan** with:
   - Files to modify (with line numbers)
   - New files to create
   - Type definitions needed
   - API contracts
   - Database schema changes (if any)
3. **Validate against existing architecture**:
   - Does the plan align with existing patterns?
   - Are there conflicts with existing features?
   - Does it follow established conventions?
4. **Handoff to Coder**: Pass the plan with exact specifications

**Plan Template:**
```markdown
## Implementation Plan: [Feature Name]

### Architecture Validation
- [ ] Aligns with ARCHITECTURE_DECISION.md
- [ ] No conflicts with existing features
- [ ] Follows established patterns

### Files to Modify
1. `path/to/file.py` — Description of changes

### New Files to Create
1. `path/to/new_file.py` — Purpose

### API Contracts
```json
{
  "endpoint": "/api/v1/...",
  "method": "GET|POST|PUT|DELETE",
  "request": { ... },
  "response": { ... }
}
```

### Testing Strategy
- Unit tests: [list]
- Integration tests: [list]
- Manual validation: [steps]
```

### Mode 2: Coder Agent
**Role:** Implement planned tasks with production-quality code

**Responsibilities:**
1. **Read the architect's plan** exactly as specified
2. **Understand existing code patterns** before writing:
   - Read neighboring files for conventions
   - Match existing code style
   - Use existing libraries/utilities
3. **Implement the plan** with:
   - Proper error handling
   - Type safety (Python type hints)
   - Logging for debugging
   - Input validation
4. **Validate after each file**:
   ```bash
   python -m mypy app/           # Type check
   python -m pytest tests/       # Run tests
   python -m ruff check app/     # Lint
   ```
5. **Handoff to QA**: List all changes made

### Mode 3: QA Agent
**Role:** Validate implementations, run tests, commit when all checks pass

**Responsibilities:**
1. **Run validation checklist**:
   ```bash
   python -m mypy app/           # Must pass with 0 errors
   python -m ruff check app/     # Must pass with exit 0
   python -m pytest tests/       # All tests must pass
   uvicorn app.main:app          # Server must start
   ```
2. **Test the feature**:
   - Make API calls to verify endpoints work
   - Check response shapes match contracts
   - Verify error handling works
3. **If all checks pass**:
   - Stage changes: `git add -A`
   - Review: `git status` and `git diff --cached --stat`
   - Commit with descriptive message
   - Update documentation
4. **If checks fail**:
   - Document the failure
   - Return to Coder with specific fix instructions
   - Re-validate after fixes

---

## 2. Validation Requirements

### Pre-Commit Validation Checklist
Every agent must run these before committing:

```bash
# 1. Type checking (must pass with 0 errors)
python -m mypy app/ tests/

# 2. Linting (must pass with exit 0)
python -m ruff check app/ tests/

# 3. Tests (all must pass)
python -m pytest tests/ -v

# 4. Server startup (must start without errors)
uvicorn app.main:app --host 0.0.0.0 --port <PORT>

# 5. API endpoint verification
curl http://localhost:<PORT>/health
curl http://localhost:<PORT>/api/v1/...
```

### Integration Testing
After implementing, verify connectivity with other services:

```bash
# Test Customer Portal can reach this service
curl http://localhost:<PORT>/api/v1/...

# Test Service Registry registration (if applicable)
curl http://localhost:3006/api/v1/registry/services/<service_name>
```

---

## 3. Security Requirements

### Authentication & Authorization
1. **All API endpoints must require authentication** unless explicitly public
2. **Use existing auth patterns** from other services:
   - Clerk JWT verification for user-facing endpoints
   - X-API-Key for service-to-service calls
3. **Never log sensitive data** (API keys, tokens, PII)
4. **Validate all inputs** before processing

### Security Headers
All responses must include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Rate Limiting
Implement rate limiting on all public endpoints:
- Default: 100 requests per minute per IP
- Stricter limits for authentication endpoints

### Audit Logging
All authentication events must be logged:
- Successful logins
- Failed authentication attempts
- Permission denials
- API key usage

---

## 4. Documentation Standards

### Required Documentation
Every feature implementation must include:

1. **API Documentation** (in code docstrings):
   ```python
   @router.get("/endpoint", response_model=ResponseModel)
   async def get_endpoint():
       """
       Brief description of what this endpoint does.
       
       Returns:
           ResponseModel: Description of the response
           
       Raises:
           HTTPException: 404 if not found
           HTTPException: 401 if unauthorized
       """
   ```

2. **Update service documentation**:
   - `README.md` — Service overview and setup
   - `docs/` — Feature-specific documentation
   - API contracts in `docs/api/`

3. **Update shared documentation**:
   - `ARCHITECTURE_DECISION.md` (in Customer Portal repo)
   - `COMPLETE_CUSTOMER_PORTAL_FEATURES.md` (in Customer Portal repo)

### Documentation Update Process
After implementing a feature:

1. **Update README.md** with new endpoints
2. **Create/update feature docs** in `docs/`
3. **Update API contracts** if changed
4. **Notify Customer Portal agent** of changes

---

## 5. Creating & Updating Agent Skills

### Skill Structure
Create skills in `.opencode/skills/<skill-name>/SKILL.md`:

```markdown
---
name: <skill-name>
description: One sentence covering what this skill does AND when to trigger it.
---

# Skill Name

## Overview
Brief description of the skill's purpose.

## When to Use
- Trigger condition 1
- Trigger condition 2

## Implementation Steps
1. Step 1
2. Step 2
3. Step 3

## Validation Checklist
- [ ] Check 1
- [ ] Check 2

## Files to Modify
- `path/to/file.py`
```

### Skill Update Process
1. **Create skill** when implementing a new feature
2. **Update skill** when the feature changes
3. **Delete skill** when the feature is removed
4. **Review skills** monthly for accuracy

### Required Skills for Each Service

**Platform Analytics Service:**
- `event-ingestion` — How to ingest and process analytics events
- `dashboard-api` — Dashboard statistics endpoints
- `reporting` — Report generation and export

**Internal Ops Service:**
- `service-registry` — Service registration and discovery
- `audit-logging` — Audit log management
- `configuration` — Service configuration management

---

## 6. Progress Tracking (Todo Management)

### Todo File Structure
Maintain a `TODO.md` file in the service root:

```markdown
# Service TODO

## In Progress
- [ ] Feature 1 — Description, assigned to, started date
- [ ] Feature 2 — Description, assigned to, started date

## Completed
- [x] Feature 3 — Completed date, commit hash
- [x] Feature 4 — Completed date, commit hash

## Blocked
- [ ] Feature 5 — Blocked by [reason], needs [action]

## Backlog
- [ ] Feature 6 — Priority: High/Medium/Low
- [ ] Feature 7 — Priority: High/Medium/Low
```

### Progress Update Process
1. **Update TODO.md** when starting a feature
2. **Move to Completed** when feature is committed
3. **Add blockers** with specific reasons and needed actions
4. **Review weekly** to update priorities

---

## 7. What Customer Portal Agent Needs from You

### For Testing Phase 3 & 4 Features

The Customer Portal agent needs the following from Platform Analytics and Internal Ops to conduct end-to-end testing:

#### From Platform Analytics Service (port 3071):

1. **Event Ingestion Endpoint**:
   - `POST /api/v1/analytics/portal-events` must accept events from Customer Portal
   - Response: `{"ok": true}` (200)
   - Must handle events with shape:
     ```json
     {
       "event": {
         "event_type": "session_started",
         "event_category": "SESSION",
         "tenant_id": "uuid",
         "user_id": "uuid",
         "session_id": "s_...",
         "page_path": "/dashboard",
         "client_ts": "2026-05-19T..."
       }
     }
     ```

2. **Dashboard Statistics Endpoint**:
   - `GET /api/v1/analytics/dashboard?tenantId=...` must return stats
   - Response shape:
     ```json
     {
       "stats": {
         "page_views": 1234,
         "unique_users": 56,
         "session_duration_avg": 300,
         "events_today": 567
       }
     }
     ```

3. **Event Query Endpoint** (for testing):
   - `GET /api/v1/analytics/events?tenantId=...&event_type=...`
   - Returns list of events for verification

#### From Internal Ops Service (port 3006):

1. **Service Registry Endpoints**:
   - `POST /api/v1/registry/register` — Register services
   - `POST /api/v1/registry/heartbeat` — Liveness pings
   - `GET /api/v1/registry/services/{name}` — Service lookup
   - `DELETE /api/v1/registry/deregister` — Deregister on shutdown

2. **Module Registration**:
   - `POST /api/v1/registry/modules` — Register modules/features
   - `GET /api/v1/registry/{service}/modules` — Get modules for service

3. **Integration Contracts**:
   - `POST /api/v1/integrations` — Register integration contracts
   - `GET /api/v1/integrations/{service}` — Get integration partners

4. **Audit Logging**:
   - `POST /api/v1/audit/log` — Log audit events
   - `GET /api/v1/audit/logs?service=...` — Query audit logs

### Testing Verification Steps

After services are running, Customer Portal agent will:

1. **Test Event Flow**:
   ```bash
   # Send event from Customer Portal
   curl -X POST http://localhost:3031/api/analytics/track \
     -H "Content-Type: application/json" \
     -d '{"event": {"event_type": "test_event", "event_category": "SESSION"}}'
   
   # Verify event reached Platform Analytics
   curl http://localhost:3071/api/v1/analytics/events?event_type=test_event
   ```

2. **Test Service Registry**:
   ```bash
   # Verify Customer Portal is registered
   curl http://localhost:3006/api/v1/registry/services/truevow-customer-portal
   
   # Verify heartbeat is working
   curl http://localhost:3006/api/v1/registry/heartbeat
   ```

3. **Test Billing Integration**:
   ```bash
   # Test feature-access through Customer Portal proxy
   curl http://localhost:3031/api/billing/feature-access?tenantId=...
   
   # Verify billing service received the request
   curl http://localhost:3016/api/v1/billing/tenants/.../feature-access \
     -H "X-API-Key: ..."
   ```

---

## 8. Service Startup Instructions

### Platform Analytics Service (port 3071)

```bash
cd C:\Users\yasha\OneDrive\Documents\TrueVow\Cursor\TrueVow_Platform_Analytics_Service

# Activate venv
.venv\Scripts\Activate.ps1

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start service
$env:SKIP_REGISTRY="true"
python -m uvicorn app.main:app --host 0.0.0.0 --port 3071
```

### Internal Ops Service (port 3006)

```bash
cd C:\Users\yasha\OneDrive\Documents\TrueVow\Cursor\TrueVow_Internal_Ops_Service

# Activate venv
.venv\Scripts\Activate.ps1

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Start service
$env:SKIP_REGISTRY="true"
python -m uvicorn app.main:app --host 0.0.0.0 --port 3006
```

### Verification

After starting both services:

```bash
# Check Platform Analytics
curl http://localhost:3071/health

# Check Internal Ops
curl http://localhost:3006/health

# Verify all services are running
netstat -ano | findstr "LISTENING" | findstr /C:":3001" /C:":3031" /C:":3016" /C:":3071" /C:":3006" /C:":3021" /C:":3008"
```

---

## 9. Communication Protocol

### When to Notify Customer Portal Agent

Notify the Customer Portal agent when:

1. **New endpoints are implemented** — Provide endpoint details and response shapes
2. **API contracts change** — Document the changes
3. **Services are started/stopped** — Update service status
4. **Testing is ready** — Confirm all endpoints are accessible

### Notification Format

```markdown
## Service Update: [Service Name]

### Status: [Started/Stopped/Updated]

### New Endpoints
- `METHOD /api/v1/...` — Description
  - Request: {...}
  - Response: {...}

### Breaking Changes
- [List any breaking changes]

### Testing Ready: [Yes/No]
```

---

## 10. Error Handling Standards

### Error Response Format
All error responses must follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes
- `AUTH_REQUIRED` — Authentication required
- `INVALID_TOKEN` — Invalid or expired token
- `FORBIDDEN` — Insufficient permissions
- `NOT_FOUND` — Resource not found
- `VALIDATION_ERROR` — Input validation failed
- `SERVICE_UNAVAILABLE` — Service temporarily unavailable

### Logging Standards
- Use `structlog` for structured logging
- Include `request_id` in all log entries
- Log level: `INFO` for normal operations, `WARNING` for recoverable errors, `ERROR` for failures
- Never log sensitive data

---

## Summary Checklist for Agents

Before considering a feature complete:

- [ ] Three-mode workflow followed (Architect → Coder → QA)
- [ ] Type checking passes (`mypy`)
- [ ] Linting passes (`ruff`)
- [ ] All tests pass (`pytest`)
- [ ] Server starts without errors
- [ ] API endpoints respond correctly
- [ ] Security requirements met (auth, validation, audit logging)
- [ ] Documentation updated (README, docs, API contracts)
- [ ] Skills created/updated in `.opencode/skills/`
- [ ] TODO.md updated with progress
- [ ] Customer Portal agent notified of changes
- [ ] Integration testing completed with Customer Portal
