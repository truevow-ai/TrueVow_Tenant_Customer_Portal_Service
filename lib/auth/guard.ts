/**
 * Auth Guard — RBAC middleware for Customer Portal API routes
 *
 * Adapts Clerk session claims to role-based access control.
 * All API routes pass through this guard before reaching handlers.
 *
 * Role hierarchy (from @truevow/rbac-engine):
 *   Level A: SUPER_ADMIN, ADMIN, FINANCE, MANAGEMENT
 *   Level B: CUSTOMER_SUCCESS, OPERATIONS, CLIENT_ONBOARDING_MANAGER
 *   Level C: SALES, SUPPORT, STAFF, MARKETING
 *   Level D: OWNER, BILLING_ADMIN, ATTORNEY, PARALEGAL, CLIENT
 *
 * Permission domain reference:
 *   tenant:* — tenant management
 *   billing:* — subscription & billing
 *   user:* — user & team management
 *   ticket:* — support tickets
 *   lead:* — sales leads & intake
 *   settings:* — account settings
 *   audit:read — compliance
 *   integration:manage — third-party integrations
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// --- Role definitions (mirrors @truevow/rbac-engine) ---

enum RoleLevel {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
}

interface RoleDefinition {
  id: string;
  level: RoleLevel;
  domain: string;
}

const ROLE_REGISTRY: Record<string, RoleDefinition> = {
  SUPER_ADMIN: { id: "SUPER_ADMIN", level: RoleLevel.A, domain: "PLATFORM_OPERATORS" },
  ADMIN: { id: "ADMIN", level: RoleLevel.A, domain: "PLATFORM_OPERATORS" },
  FINANCE: { id: "FINANCE", level: RoleLevel.A, domain: "PLATFORM_OPERATORS" },
  MANAGEMENT: { id: "MANAGEMENT", level: RoleLevel.A, domain: "PLATFORM_OPERATORS" },
  CUSTOMER_SUCCESS: { id: "CUSTOMER_SUCCESS", level: RoleLevel.B, domain: "PLATFORM_OPERATORS" },
  CLIENT_ONBOARDING_MANAGER: { id: "CLIENT_ONBOARDING_MANAGER", level: RoleLevel.B, domain: "PLATFORM_OPERATORS" },
  OPERATIONS: { id: "OPERATIONS", level: RoleLevel.B, domain: "PLATFORM_OPERATORS" },
  SALES: { id: "SALES", level: RoleLevel.C, domain: "SALES_SUPPORT" },
  SUPPORT: { id: "SUPPORT", level: RoleLevel.C, domain: "SALES_SUPPORT" },
  STAFF: { id: "STAFF", level: RoleLevel.C, domain: "PLATFORM_OPERATORS" },
  MARKETING: { id: "MARKETING", level: RoleLevel.C, domain: "PLATFORM_OPERATORS" },
  OWNER: { id: "OWNER", level: RoleLevel.D, domain: "TENANTS" },
  BILLING_ADMIN: { id: "BILLING_ADMIN", level: RoleLevel.D, domain: "TENANTS" },
  ATTORNEY: { id: "ATTORNEY", level: RoleLevel.D, domain: "TENANTS" },
  PARALEGAL: { id: "PARALEGAL", level: RoleLevel.D, domain: "TENANTS" },
  CLIENT: { id: "CLIENT", level: RoleLevel.D, domain: "TENANTS" },
};

// --- Permission definitions (mirrors @truevow/rbac-engine) ---

enum Permission {
  TENANT_CREATE = "tenant:create",
  TENANT_READ = "tenant:read",
  TENANT_UPDATE = "tenant:update",
  TENANT_DELETE = "tenant:delete",
  TENANT_IMPERSONATE = "tenant:impersonate",
  BILLING_READ = "billing:read",
  BILLING_SET_TIER = "billing:set_tier",
  BILLING_ADJUST_INVOICE = "billing:adjust_invoice",
  BILLING_APPLY_DISCOUNT = "billing:apply_discount",
  BILLING_PROCESS_REIMBURSEMENT = "billing:process_reimbursement",
  BILLING_SELF_SERVICE_CHANGE = "billing:self_service_change",
  USER_CREATE = "user:create",
  USER_READ = "user:read",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",
  USER_MANAGE_ROLES = "user:manage_roles",
  TICKET_CREATE = "ticket:create",
  TICKET_READ = "ticket:read",
  TICKET_ASSIGN = "ticket:assign",
  TICKET_CLOSE = "ticket:close",
  LEAD_CREATE = "lead:create",
  LEAD_READ = "lead:read",
  LEAD_UPDATE = "lead:update",
  SETTINGS_READ = "settings:read",
  SETTINGS_UPDATE = "settings:update",
  AUDIT_READ = "audit:read",
  INTEGRATION_MANAGE = "integration:manage",
}

const PERMISSION_RULES: Record<Permission, RoleLevel> = {
  [Permission.TENANT_CREATE]: RoleLevel.A,
  [Permission.TENANT_READ]: RoleLevel.D,
  [Permission.TENANT_UPDATE]: RoleLevel.B,
  [Permission.TENANT_DELETE]: RoleLevel.A,
  [Permission.TENANT_IMPERSONATE]: RoleLevel.A,
  [Permission.BILLING_READ]: RoleLevel.D,
  [Permission.BILLING_SET_TIER]: RoleLevel.B,
  [Permission.BILLING_ADJUST_INVOICE]: RoleLevel.B,
  [Permission.BILLING_APPLY_DISCOUNT]: RoleLevel.C,
  [Permission.BILLING_PROCESS_REIMBURSEMENT]: RoleLevel.B,
  [Permission.BILLING_SELF_SERVICE_CHANGE]: RoleLevel.D,
  [Permission.USER_CREATE]: RoleLevel.C,
  [Permission.USER_READ]: RoleLevel.D,
  [Permission.USER_UPDATE]: RoleLevel.C,
  [Permission.USER_DELETE]: RoleLevel.C,
  [Permission.USER_MANAGE_ROLES]: RoleLevel.B,
  [Permission.TICKET_CREATE]: RoleLevel.D,
  [Permission.TICKET_READ]: RoleLevel.D,
  [Permission.TICKET_ASSIGN]: RoleLevel.C,
  [Permission.TICKET_CLOSE]: RoleLevel.C,
  [Permission.LEAD_CREATE]: RoleLevel.D,
  [Permission.LEAD_READ]: RoleLevel.D,
  [Permission.LEAD_UPDATE]: RoleLevel.C,
  [Permission.SETTINGS_READ]: RoleLevel.D,
  [Permission.SETTINGS_UPDATE]: RoleLevel.C,
  [Permission.AUDIT_READ]: RoleLevel.B,
  [Permission.INTEGRATION_MANAGE]: RoleLevel.B,
};

// --- RBAC Context ---

interface RBACContext {
  userId: string;
  roleId: string;
  roleLevel: RoleLevel;
  domain: string;
  tenantId: string | null;
}

// --- Core guard functions ---

function getLevelValue(level: RoleLevel): number {
  const map: Record<RoleLevel, number> = {
    [RoleLevel.A]: 4,
    [RoleLevel.B]: 3,
    [RoleLevel.C]: 2,
    [RoleLevel.D]: 1,
  };
  return map[level];
}

function hasPermission(roleLevel: RoleLevel, permission: Permission): boolean {
  const requiredLevel = PERMISSION_RULES[permission];
  if (!requiredLevel) return false;
  return getLevelValue(roleLevel) >= getLevelValue(requiredLevel);
}

function resolveRoleId(clerkRole: string | undefined): string {
  if (!clerkRole) return "CLIENT";
  const upper = clerkRole.toUpperCase().replace(/\s+/g, "_");
  return ROLE_REGISTRY[upper] ? upper : "CLIENT";
}

async function getRBACContext(): Promise<RBACContext | null> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const metadata = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
  const roleId = resolveRoleId(metadata.role as string | undefined);
  const roleDef = ROLE_REGISTRY[roleId] ?? ROLE_REGISTRY.CLIENT;
  const tenantId = (metadata.tenantId as string) ?? null;

  return {
    userId,
    roleId,
    roleLevel: roleDef.level,
    domain: roleDef.domain,
    tenantId,
  };
}

// --- Higher-order route wrappers ---

type ApiHandler = (req: NextRequest, ctx: RBACContext) => Promise<NextResponse>;

/**
 * Require authentication. Passes RBACContext to handler.
 * Returns 401 if not authenticated.
 */
export function withAuth(handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ctx = await getRBACContext();
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return handler(req, ctx);
  };
}

/**
 * Require a specific permission level.
 * Returns 403 if role doesn't have sufficient level.
 */
export function withPermission(permission: Permission, handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ctx = await getRBACContext();
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!hasPermission(ctx.roleLevel, permission)) {
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

/**
 * Require minimum role level.
 * Returns 403 if role level is below required.
 */
export function withLevel(minLevel: RoleLevel, handler: ApiHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const ctx = await getRBACContext();
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (getLevelValue(ctx.roleLevel) < getLevelValue(minLevel)) {
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

/**
 * Require that the authenticated user belongs to the requested tenant.
 * Validates tenantId from Clerk metadata matches the route param or body.
 */
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
      // Platform operators (level A/B) can access any tenant
      if (getLevelValue(ctx.roleLevel) < getLevelValue(RoleLevel.B)) {
        return NextResponse.json(
          { error: "Cannot access another tenant's data" },
          { status: 403 }
        );
      }
    }

    return handler(req, ctx);
  };
}

// --- Re-exports for route handlers ---

export { RoleLevel, Permission, ROLE_REGISTRY, getRBACContext, hasPermission };
export type { RBACContext, ApiHandler };
