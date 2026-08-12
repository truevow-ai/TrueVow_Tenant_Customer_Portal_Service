/**
 * Auth Guard — RBAC middleware for Customer Portal API routes
 *
 * Uses @truevow/auth (Supabase JWT verification) and @truevow/rbac-engine for
 * centralized role hierarchy, permissions, and domain enforcement.
 *
 * Backward-compatible API surface: withAuth, withPermission, withLevel, withTenantScope
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseJwt } from "@truevow/auth";
import {
  RoleLevel,
  Permission,
  ROLE_REGISTRY,
  hasPermission as rbacHasPermission,
  getRoleById,
  isRoleHigherOrEqual,
  type RoleDefinition,
} from "@truevow/rbac-engine";

// --- Re-exports for backward compatibility ---
export { RoleLevel, Permission, ROLE_REGISTRY };
export type { RoleDefinition };

// --- RBAC Context ---

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

function resolveRoleId(metadataRole: string | undefined): string {
  if (!metadataRole) return "CLIENT";
  const upper = metadataRole.toUpperCase().replace(/\s+/g, "_");
  const role = getRoleById(upper);
  return role ? upper : "CLIENT";
}

async function getRBACContext(req: NextRequest): Promise<RBACContext | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const ctx = await verifySupabaseJwt(token);
  if (!ctx) return null;

  const userId = ctx.sub;
  const metadata = (ctx as any).user_metadata ?? {};
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
  return rbacHasPermission(roleId, permission, domain as any);
}

// --- Higher-order route wrappers ---

export function withAuth(handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ctx = await getRBACContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return handler(req, ctx);
  };
}

export function withPermission(permission: Permission, handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ctx = await getRBACContext(req);
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!rbacHasPermission(ctx.roleId, permission, ctx.domain as any)) {
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
    const ctx = await getRBACContext(req);
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
    const ctx = await getRBACContext(req);
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

export { getRBACContext, hasPermission };
