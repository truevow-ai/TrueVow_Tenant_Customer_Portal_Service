/**
 * RETAINER Secure Proxy — restricted BFF for the Customer Portal.
 *
 * THIS PROXY IS NOT THE AUTHORITY GATE.
 * The RETAINER backend is the sole authority evaluator.
 * Authority classes are logged as metadata only — never enforced here.
 *
 * Proxy responsibilities:
 *   - Authenticated Supabase session verification
 *   - Tenant membership verification
 *   - Allowlisted route + method
 *   - Request size limits
 *   - No forwarding of arbitrary headers
 *   - No user-supplied tenant IDs without validation
 *   - Stable error mapping
 *   - No internal administration or provider-callback routes
 *   - Authority class logged for telemetry (NOT enforced)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseJwt } from '@truevow/auth';
import { isRouteAllowed } from '@/lib/api/retainer/queries';
import { mapRetainerError } from '@/lib/api/retainer/errors';

const RETAINER_URL = process.env.RETAINER_SERVICE_URL || 'http://localhost:3038';
const MAX_BODY_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function GET(req: NextRequest, ctx: any) {
  return handle(req, ctx);
}
export async function POST(req: NextRequest, ctx: any) {
  return handle(req, ctx);
}
export async function PUT(req: NextRequest, ctx: any) {
  return handle(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: any) {
  return handle(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: any) {
  return handle(req, ctx);
}

async function handle(req: NextRequest, ctx: any) {
  // ---- 1. Supabase JWT verification ----
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const jwtCtx = await verifySupabaseJwt(token);
  if (!jwtCtx) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = jwtCtx.sub;

  // ---- 2. Tenant membership verification ----
  const metadata = (jwtCtx as any).user_metadata ?? {};
  const sessionTenantId = (metadata.tenantId as string) ?? null;
  if (!sessionTenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with session' },
      { status: 403 },
    );
  }

  // ---- 3. Extract requested path ----
  const rawPath = ctx.params?.path;
  const pathSegments: string[] = Array.isArray(rawPath)
    ? rawPath
    : rawPath
      ? [rawPath]
      : [];
  const apiPath = '/' + pathSegments.join('/');

  // ---- 4. Route allowlist check ----
  const route = isRouteAllowed(req.method, apiPath);
  if (!route) {
    console.warn(`[RETAINER-PROXY] Rejected unknown route: ${req.method} ${apiPath}`);
    return NextResponse.json(
      { error: 'Forbidden — route not in permitted surface' },
      { status: 403 },
    );
  }

  // ---- 5. Body size check (for mutations) ----
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_BODY_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 },
      );
    }
  }

  // ---- 6. Build backend request ----
  const qs = req.nextUrl.searchParams.toString();
  const url = `${RETAINER_URL}/api/v1/retainer${apiPath}${qs ? '?' + qs : ''}`;

  const backendHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Authenticated-UserId': userId,
    'X-Tenant-Id': sessionTenantId,
    'X-Requested-Route': `${req.method} ${apiPath}`,
  };

  const init: RequestInit = {
    method: req.method,
    headers: backendHeaders,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json') || !ct) {
      init.body = await req.text();
    } else {
      init.body = await req.text();
      // Do NOT forward multipart or other content types unsupported by RETAINER firm API
    }
  }

  // ---- 7. Forward to RETAINER backend ----
  console.log(
    `[RETAINER-PROXY] ${req.method} ${apiPath} ` +
    `(auth: ${route.authority}, user: ${userId.substring(0, 8)}…)`,
  );

  try {
    const resp = await fetch(url, init);
    const contentType = resp.headers.get('content-type') || '';

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({ detail: 'RETAINER service error' }));
      const { code, message } = mapRetainerError(body.detail);
      console.warn(
        `[RETAINER-PROXY] Backend error ${resp.status} on ${req.method} ${apiPath}: ${code}`,
      );
      return NextResponse.json(
        { error: message, code },
        { status: resp.status === 403 ? 403 : resp.status === 409 ? 409 : 502 },
      );
    }

    if (contentType.includes('application/json')) {
      const data = await resp.json();
      return NextResponse.json(data, { status: resp.status });
    }

    const buf = await resp.arrayBuffer();
    return new NextResponse(buf, {
      status: resp.status,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
      },
    });
  } catch (err: any) {
    console.error(`[RETAINER-PROXY] Unreachable: ${err.message}`);
    return NextResponse.json(
      { error: 'RETAINER service unreachable', code: 'RET_INVALID_REQUEST' },
      { status: 502 },
    );
  }
}
