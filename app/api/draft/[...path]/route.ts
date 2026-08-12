/**
 * DRAFT Service API Proxy
 *
 * Server-side proxy for DRAFT operations. All browser-to-DRAFT traffic
 * routes through here so the API key never reaches the client bundle.
 *
 * GET    /api/draft/validate → forwarded to Tenant App DRAFT
 * POST   /api/draft/validate → forwarded to Tenant App DRAFT
 * GET    /api/draft/rules     → forwarded to Tenant App DRAFT
 * GET    /api/draft/history   → forwarded to Tenant App DRAFT
 * GET    /api/draft/stats     → forwarded to Tenant App DRAFT
 * GET    /api/draft/health    → forwarded to Tenant App DRAFT
 * POST   /api/draft/deadlines/calculate → forwarded to Tenant App
 */

import { NextRequest, NextResponse } from 'next/server';

const TENANT_APP_URL = process.env.TENANT_APP_URL || 'http://localhost:8000';
const API_KEY = process.env.TENANT_APP_API_KEY || '';

const ALLOWED_PREFIXES = [
  '/api/v1/draft/',
  '/api/v1/validation/',
  '/api/v1/deadlines/',
];

function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(req, params, 'GET');
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(req, params, 'POST');
}

async function proxyRequest(
  req: NextRequest,
  { path }: { path: string[] },
  method: string
): Promise<NextResponse> {
  const upstreamPath = '/' + path.join('/');
  const queryString = req.nextUrl.search;

  if (!isAllowedPath(upstreamPath)) {
    return NextResponse.json(
      { error: `Path not allowed: ${upstreamPath}` },
      { status: 403 }
    );
  }

  const targetUrl = `${TENANT_APP_URL}${upstreamPath}${queryString}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (API_KEY) headers['X-API-Key'] = API_KEY;

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(15000),
    };

    if (method !== 'GET') {
      const body = await req.text();
      fetchOptions.body = body;
    }

    const res = await fetch(targetUrl, fetchOptions);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || data.detail || `Upstream returned ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[api/draft] DRAFT service unreachable:', msg);
    return NextResponse.json(
      { error: 'DRAFT service unavailable', _service_unavailable: true },
      { status: 502 }
    );
  }
}

export const dynamic = 'force-dynamic';
