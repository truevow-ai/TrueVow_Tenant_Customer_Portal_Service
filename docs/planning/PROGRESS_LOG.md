## 2026-08-01 06:51 — Billing Architecture + Pricing Finalized

- INTAKE: per billable call (/,299/,999), duration is internal shadow meter
- TRACE: Start  / Essential  / Complete  per activated Matter, packages RETAINER internally
- SETTLE: Per Case  / Pro /mo
- COMMAND: Core included / Pro /mo/firm
- Billing Architecture: Billing Service (catalog/entitlements) → Financial Accounting (invoices/payments) ← Customer Portal (display only)
- Subscription states: PENDING/TRIAL/ACTIVE/PAST_DUE/GRACE/SUSPENDED/CANCELLED/EXPIRED
- First 12 TRACE Complete credits for new INTAKE customers
- Four-layer entitlement enforcement documented
- Service tiers aligned: solo → growth → team

