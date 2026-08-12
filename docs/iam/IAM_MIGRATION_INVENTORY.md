# IAM Migration Inventory — Customer Portal: Clerk → Supabase Auth

**Service:** TrueVow Tenant Customer Portal Service  
**Date:** 2026-08-03  
**Migrator:** @truevow/auth (Supabase JWT + SSO)  
**Predecessor:** Clerk App 3 (`@clerk/nextjs` + `@truevow/auth-client`)

---

## Files Changed (21 files)

### Core Auth Infrastructure
| File | Change |
|------|--------|
| `package.json` | Replaced `@clerk/nextjs` + `@truevow/auth-client` → `@truevow/auth` + `@supabase/ssr` |
| `next.config.js` | Removed `@truevow/auth-client` from transpilePackages; added `@truevow/auth` |
| `middleware.ts` | Replaced `clerkMiddleware` / `createRouteMatcher` → Supabase SSR `createServerClient` + cookie management |
| `.env.local` | Removed all `CLERK_*` vars; added `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `.env.backup.ini` | Same Clerk → Supabase env var swap |

### Root Layout & Providers
| File | Change |
|------|--------|
| `app/layout.tsx` | Replaced `<ClerkProvider publishableKey={...}>` → `<TrueVowAuthProvider>` |
| `components/Providers.tsx` | Unchanged (already a thin wrapper) |

### Auth Pages (Sign In / Sign Up)
| File | Change |
|------|--------|
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Replaced Clerk `<SignIn />` → custom email/password form using `useAuth().signIn()` |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Replaced Clerk `<SignUp />` → custom form using `supabase.auth.signUp()` |
| `app/(dashboard)/layout.tsx` | Replaced `useUser` from Clerk → `@truevow/auth`; replaced `<UserButton>` → custom avatar+signOut |
| `app/no-tenant/page.tsx` | Replaced `<SignOutButton>` → `useAuth().signOut()` button |

### Hooks
| File | Change |
|------|--------|
| `hooks/useTenant.ts` | Replaced `useAuth/useUser` from Clerk → `@truevow/auth`; changed `publicMetadata` → `user_metadata`; changed `primaryEmailAddress.emailAddress` → `email` |

### API Routes — Auth Guard
| File | Change |
|------|--------|
| `lib/auth/guard.ts` | Replaced `auth()` from Clerk → `verifySupabaseJwt()` from `@truevow/auth`; removed `@truevow/auth-client` dependency; added `getRBACContext(req)` requiring Bearer token |

### API Routes — Team Management
| File | Change |
|------|--------|
| `app/api/team/provision-first-admin/route.ts` | Replaced `clerkClient().users.createUser()` → `supabaseAdmin.auth.admin.createUser()`; replaced `getUserList` → Supabase admin API |
| `app/api/team/invite/route.ts` | Replaced `auth()` + `clerkClient()` with `verifySupabaseJwt()` + Supabase admin CRUD; replaced `getUserList`/`getUser`/`deleteUser` → Supabase admin API |

### API Routes — CS Support Proxy
| File | Change |
|------|--------|
| `app/api/cs-support/tickets/route.ts` | Replaced `currentUser()` → `verifySupabaseJwt()`; changed `user.emailAddresses[0]?.emailAddress` → `ctx.email` |
| `app/api/cs-support/tickets/[id]/route.ts` | Same `currentUser()` → JWT pattern |
| `app/api/cs-support/tickets/[id]/reply/route.ts` | Same `currentUser()` → JWT pattern |
| `app/api/cs-support/tickets/[id]/messages/route.ts` | Same `currentUser()` → JWT pattern |
| `app/api/cs-support/kb/route.ts` | Same `currentUser()` → JWT pattern |

### API Routes — RETAINER Proxy
| File | Change |
|------|--------|
| `app/api/retainer/[...path]/route.ts` | Replaced `auth()` → `verifySupabaseJwt()`; changed `sessionClaims.publicMetadata` → JWT `user_metadata` |

### Client-side API Calls
| File | Change |
|------|--------|
| `lib/api/certificates.ts` | Removed Clerk dynamic import; now requires explicit token (caller passes `session.access_token`) |
| `components/certificates/CertificateLink.tsx` | Replaced `getToken()` → `session?.access_token` |
| `app/certificates/page.tsx` | Same `getToken()` → `session?.access_token` |
| `app/certificates/[certificateRef]/page.tsx` | Same `getToken()` → `session?.access_token` |

### Dashboard Pages
| File | Change |
|------|--------|
| `app/(dashboard)/dashboard/billing/page.tsx` | Replaced `useUser` from Clerk → `@truevow/auth`; changed `publicMetadata` → `user_metadata`; changed `fullName` → `user_metadata.full_name` |
| `app/(dashboard)/dashboard/trace/page.tsx` | Replaced `useUser` import only |
| `app/(dashboard)/dashboard/settings/page.tsx` | Replaced `useClerk/useUser` → `useUser` from `@truevow/auth`; removed `openUserProfile()` call; changed `emailAddresses[0]?.emailAddress` → `email`; changed `firstName/lastName` → parse from `user_metadata.full_name` |

---

## API Surface Mapping

| Clerk API | Supabase Replacement |
|-----------|---------------------|
| `auth()` from `@clerk/nextjs/server` | `verifySupabaseJwt(token)` — extract from Bearer header |
| `currentUser()` from `@clerk/nextjs/server` | `verifySupabaseJwt(token)` — then read `.email` |
| `clerkClient().users.createUser()` | `supabaseAdmin.auth.admin.createUser()` |
| `clerkClient().users.getUserList()` | `supabaseAdmin.auth.admin.listUsers()` |
| `clerkClient().users.getUser()` | `supabaseAdmin.auth.admin.getUserById()` |
| `clerkClient().users.deleteUser()` | `supabaseAdmin.auth.admin.deleteUser()` |
| `user.publicMetadata` | `user.user_metadata` |
| `user.primaryEmailAddress?.emailAddress` | `user.email` |
| `user.fullName` / `user.firstName` / `user.lastName` | `user.user_metadata.full_name` |
| `user.imageUrl` | `user.user_metadata.avatar_url` |
| `getToken()` (client) | `session.access_token` |
| `<UserButton />` | Custom button calling `signOut()` |
| `<SignOutButton />` | Custom button calling `signOut()` |
| `<SignIn />` | Custom form using `signIn(email, password)` |
| `<SignUp />` | Custom form using `supabase.auth.signUp()` |
| `clerkMiddleware()` | Supabase SSR `createServerClient` + cookie sync |

---

## New Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Optional (auto-derived from SUPA_URL):
```
SUPABASE_JWKS_URL=https://<project>.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_ISSUER=https://<project>.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated
```

## Removed Environment Variables

All `CLERK_*` vars removed: `CLERK_APP_1_*`, `CLERK_APP_2_*`, `CLERK_APP_3_*`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
