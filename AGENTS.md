# Truevow_Tenant_Customer_Portal_Service — Agent Rules

# Agent Onboarding Preamble
# Drop this into any service's AGENTS.md to wire it into the ecosystem.
# The agent reads this on startup and becomes ecosystem-aware.

## WRITEBACK PROTOCOL (MANDATORY)

**You report to the TrueVow CTO Orchestrator.** Every session you work on this service, you MUST write back your learnings to the shared memory vault. Services without recent activity are flagged as STALE. Do not let this service go stale.

**Format for all writebacks:** "<service>: <specific action taken> | <result/outcome> | <what you learned> | <next step or blocker>"

### Start of Session — Activate Service
```
python ../TrueVow_Shared_Orchestration/orchestrator.py sync-memory
python ../TrueVow_Shared_Orchestration/orchestrator.py scan-services
python ../TrueVow_Shared_Orchestration/orchestrator.py agent-checkin start "Portal: <specific task> | resuming from <previous state> | goal: <what success looks like>"
```

### During Work — Log Learnings
```
python ../TrueVow_Shared_Orchestration/memory.py remember <category> "<title>" "<content>" --importance N
```
Categories: architecture, pattern, decision, dependency, convention, bug, context, todo, relationship
Importance: 10 = critical blocker, 8 = important decision, 5 = observation

### End of Session — Writeback Results
```
python ../TrueVow_Shared_Orchestration/orchestrator.py agent-checkin done "Portal: <what was accomplished> | outcome: <result> | learned: <key insight> | next: <what remains>" --status DONE
python ../TrueVow_Shared_Orchestration/orchestrator.py push-memory
```

### If Blocked — Alert Immediately
```
python ../TrueVow_Shared_Orchestration/orchestrator.py agent-checkin blocked "Portal: <specific blocker> | attempted: <what you tried> | need: <what will unblock>"
```

### Before Any Work — Route the Task
```
python ../TrueVow_Shared_Orchestration/orchestrator.py dispatch "<user's request>"
```

### Security & Research
- Scan new skills: `skillspector scan <path> --no-llm`
- Web research: `agent-reach doctor` for status

**Reminder:** Services go STALE after 24h without agent activity. Write back to prove this one is alive. The CTO dashboard refreshes every scan.

---

## Service-Specific Rules

### ROOT CLEANLINESS — NON-NEGOTIABLE
The root directory MUST stay clean. ONLY these files are allowed in the project root:

| Allowed in root | Everything else goes to |
|---|---|
| `AGENTS.md` | `.md` docs → `docs/<category>/` |
| `README.md` | Screenshots/images → `docs/screenshots/` |
| Config files (`.json`, `.js`, `.ts`, `.env*`, `*.toml`, etc.) | Scripts (`.py`, `.bat`, `.ps1`) → `scripts/` |
| Next.js app structure (`app/`, `components/`, `lib/`, etc.) | Temp/debug outputs (`.txt`, `.html`) → `docs/` or `scripts/outputs/` |
| | Test documentation → `tests/docs/` |

**Enforcement:** Before committing, verify the root has no stray files: `Get-ChildItem *.md, *.txt, *.png, *.html, *.py, *.bat, *.ps1` should return only `AGENTS.md` and `README.md`.

> Add service-specific rules below. The ecosystem preamble above is auto-generated
> and wires this agent into the TrueVow Agent Ecosystem.
