import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const TRACE_URL = process.env.TRACE_SERVICE_URL || 'http://localhost:3036';
const JWT_SECRET = process.env.LOCAL_JWT_SECRET || 'test-secret-at-least-32-bytes-long-000';

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signHS256(payload: object, secret: string): string {
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest();
  return `${header}.${body}.${base64url(sig)}`;
}

const DEV_JWT = signHS256(
  { sub: 'synthetic_attorney_sarah_chen', firm_id: '11111111-1111-4111-8111-111111111111', role: 'attorney', mfa: true },
  JWT_SECRET
);

export async function GET(req: NextRequest, ctx: any) { return proxy(req, ctx); }
export async function POST(req: NextRequest, ctx: any) { return proxy(req, ctx); }
export async function PUT(req: NextRequest, ctx: any) { return proxy(req, ctx); }
export async function PATCH(req: NextRequest, ctx: any) { return proxy(req, ctx); }
export async function DELETE(req: NextRequest, ctx: any) { return proxy(req, ctx); }

async function proxy(req: NextRequest, ctx: any) {
  const rawPath = ctx.params?.path;
  const pathSegments: string[] = Array.isArray(rawPath) ? rawPath : Object.values(rawPath || {});
  const apiPath = '/' + pathSegments.join('/');
  const qs = req.nextUrl.searchParams.toString();
  const url = `${TRACE_URL}/api/v1/trace${apiPath}${qs ? '?' + qs : ''}`;

  const headers: Record<string, string> = { 'Authorization': `Bearer ${DEV_JWT}` };

  console.log(`[TRACE-PROXY] ${req.method} ${url}`);

  const init: RequestInit = { method: req.method, headers };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('multipart/form-data')) {
      init.body = await req.formData();
    } else if (ct.includes('application/json') || !ct) {
      headers['Content-Type'] = 'application/json';
      init.body = await req.text();
    } else {
      init.body = await req.text();
      headers['Content-Type'] = ct;
    }
  }

  try {
    const resp = await fetch(url, init);
    const contentType = resp.headers.get('content-type') || '';

    if (contentType.includes('application/pdf')) {
      const buf = await resp.arrayBuffer();
      return new NextResponse(buf, {
        status: resp.status,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': resp.headers.get('content-disposition') || 'attachment; filename="export.pdf"',
        },
      });
    }

    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch (err: any) {
    console.error(`[TRACE-PROXY] Error: ${err.message}`);
    return NextResponse.json({ error: 'TRACE service unreachable' }, { status: 502 });
  }
}
