/**
 * Auth Guard — RBAC middleware for Customer Portal API routes
 *
 * Delegates to @truevow/rbac-engine and @truevow/auth-client for
 * centralized role hierarchy, permissions, and domain enforcement.
 *
 * Backward-compatible API surface: withAuth, withPermission, withLevel, withTenantScope
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  RoleLevel,
  Permission,
  ROLE_REGISTRY,
  hasPermission as rbacHasPermission,
  getRoleById,
  isRoleHigherOrEqual,
  type RoleDefinition,
} from "@truevow/rbac-engine";
import {
  createAuthClient,
  ClerkDomain,
  type AuthenticatedUser,
} from "@truevow/auth-client";

// --- Re-exports for backward compatibility ---
export { RoleLevel, Permission, ROLE_REGISTRY };
export type { RoleDefinition };

// --- RBAC Context (extended with domain info) ---

export interface RBACContext {
  userId: string;
  roleId: string;
  roleLevel: string;
  domain: string;
  tenantId: string | null;
  isImpersonating?: boolean;
}

export type ApiHandler = (req: NextRequest, ctx: RBACContext) => Promise<NextResponse>;

// --- Core guard functions ---

function resolveRoleId(clerkRole: string | undefined): string {
  if (!clerkRole) return "CLIENT";
  const upper = clerkRole.toUpperCase().replace(/\s+/g, "_");
  const role = getRoleById(upper);
  return role ? upper : "CLIENT";
}

async function getRBACContext(): Promise<RBACContext | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const metadata = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
  const roleId = resolveRoleId(metadata.role as string | undefined);
  const roleDef = getRoleById(roleId) ?? getRoleById("CLIENT")!;
  const tenantId = (metadata.tenantId as string) ?? null;

  return {
    userId,
    roleId,
    roleLevel: roleDef.level,
    domain: roleDef.domain,
    tenantId,
    isImpersonating: (metadata.impersonating as boolean) ?? false,
  };
}

function hasPermission(roleId: string, permission: Permission, domain?: string): boolean {
  return rbacHasPermission(roleId, permission, domain as ClerkDomain | undefined);
}

// --- Higher-order route wrappers ---

export function withAuth(handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ctx = await getRBACContext();
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return handler(req, ctx);
  };
}

export function withPermission(permission: Permission, handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ctx = await getRBACContext();
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!rbacHasPermission(ctx.roleId, permission, ctx.domain as ClerkDomain | undefined)) {
      return NextResponse.json(
        {
          error: "Insufficient permissions",
          required: permission,
          role: ctx.roleId,
        },
        { status: 403 }
      );
    }
    return handler(req, ctx);
  };
}

export function withLevel(minLevel: RoleLevel, handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ctx = await getRBACContext();
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!isRoleHigherOrEqual(ctx.roleId, minLevel)) {
      return NextResponse.json(
        {
          error: "Insufficient role level",
          required: minLevel,
          current: ctx.roleLevel,
        },
        { status: 403 }
      );
    }
    return handler(req, ctx);
  };
}

export function withTenantScope(
  handler: (req: NextRequest, ctx: RBACContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ctx = await getRBACContext();
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const urlTenantId = req.nextUrl.searchParams.get("tenant_id");
    if (urlTenantId && ctx.tenantId && urlTenantId !== ctx.tenantId) {
      const allowed = isRoleHigherOrEqual(ctx.roleId, RoleLevel.B);
      if (!allowed) {
        return NextResponse.json(
          { error: "Cannot access another tenant's data" },
          { status: 403 }
        );
      }
    }

    return handler(req, ctx);
  };
}

// --- Domain-aware auth client factory ---

export function getAuthClient() {
  return createAuthClient("customer-portal");
}

export { getRBACContext, hasPermission };
