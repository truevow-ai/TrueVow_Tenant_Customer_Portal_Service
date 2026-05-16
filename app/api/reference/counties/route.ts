import { NextRequest, NextResponse } from 'next/server';

const SAAS_ADMIN_URL =
  process.env.SAAS_ADMINISTRATION_SERVICE_URL || 'http://localhost:3001';
const API_KEY = process.env.PLATFORM_SERVICE_API_KEY || '';

/**
 * GET /api/reference/counties?state=<state_code>
 *
 * Proxies to SaaS Admin:
 *   GET /api/v1/reference/counties?state=<state_code>
 *
 * Response shape:
 * {
 *   counties: Array<{
 *     id: string;
 *     name: string;
 *     state: string;
 *     maxEnrollments: number;
 *     currentEnrollments: number;
 *     spotsRemaining: number;
 *     isFull: boolean;
 *     tierCategory: string;
 *   }>
 * }
 *
 * Returns empty counties array gracefully on upstream failure so the
 * settings page county dropdown degrades without crashing.
 */
export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state');

  const upstreamUrl = new URL(`${SAAS_ADMIN_URL}/api/v1/reference/counties`);
  if (state) upstreamUrl.searchParams.set('state', state);

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });

    if (!upstream.ok) {
      console.warn(`[reference/counties] Upstream returned ${upstream.status}`);
      return NextResponse.json({ counties: [] });
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[reference/counties GET]', err.message);
    // Graceful degradation — county dropdown shows empty rather than breaking
    return NextResponse.json({ counties: [] });
  }
}
