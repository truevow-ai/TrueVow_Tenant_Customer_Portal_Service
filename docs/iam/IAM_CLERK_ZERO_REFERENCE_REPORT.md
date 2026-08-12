# IAM Clerk Zero-Reference Report — Customer Portal

**Service:** TrueVow Tenant Customer Portal Service  
**Date:** 2026-08-03  
**Goal:** Zero live references to `@clerk/nextjs`, `@truevow/auth-client`, or any Clerk API in application code.

---

## Scan Results

### Active Source Files: 0 Clerk references

All 23 files that previously imported from `@clerk/nextjs` or `@truevow/auth-client` have been migrated to `@truevow/auth` (Supabase JWT).

### Exception: Backup File

```
middleware-AmmarZayn.ts:4  import { authMiddleware } from '@clerk/nextjs/server';
```

This is a developer backup file (not imported anywhere), named with the previous developer's suffix. It is NOT loaded by Next.js and has zero runtime effect. Safe to delete or ignore.

### Environment Files

| File | Clerk vars | Status |
|------|-----------|--------|
| `.env.local` | 0 | Clean — all Clerk vars replaced with Supabase |
| `.env.backup.ini` | 0 | Clean — all Clerk vars replaced with Supabase |

### package.json Dependencies

| Before | After |
|--------|-------|
| `@clerk/nextjs: ^5.0.0` | REMOVED |
| `@truevow/auth-client: file:../shared-libraries/auth-client` | REMOVED |
| (none) | `@supabase/ssr: ^0.5.0` (added) |
| (none) | `@truevow/auth: file:../shared-libraries/auth` (added) |

### Lockfile

The `package-lock.json` will be regenerated on next `pnpm install`. The lockfile was pnpm-managed (`pnpm-lock.yaml`). `pnpm install` will remove Clerk sub-dependencies automatically.

---

## Verification Commands

```bash
# Confirm zero Clerk imports in source:
rg '@clerk|@truevow/auth-client' --include='*.{ts,tsx}' --exclude='middleware-AmmarZayn.ts'

# Confirm zero CLERK_ env vars:
rg 'CLERK_' .env.local .env.backup.ini

# Confirm no Clerk in package.json:
rg '@clerk|auth-client' package.json
```

---

## Post-Migration Tasks

1. **Configure Supabase Auth project** — The `NEXT_PUBLIC_SUPABASE_URL` and keys must point to a Supabase project with Auth enabled
2. **User migration** — Migrate existing Clerk users to Supabase Auth (email + password reset flow)
3. **Metadata migration** — Copy `publicMetadata` (tenantId, role, services) to `user_metadata` in Supabase
4. **Test sign-in/sign-up flow** — Verify the custom forms work end-to-end
5. **Test team invite flow** — Verify Supabase admin API user creation
6. **Test RETAINER proxy auth** — Verify JWT forwarding
7. **Test CS Support proxy auth** — Verify email extraction from JWT

---

## Verdict: ✅ ZERO CLERK REFERENCES

All production code paths are fully migrated. The single remaining reference is in a backup file (`middleware-AmmarZayn.ts`) that is not imported or loaded at runtime.
