/**
 * Carrier Patterns API Proxy Route
 *
 * Forwards GET /api/settle/carrier-patterns to the SETTLE backend:
 *   GET {SETTLE_BACKEND_URL}/api/v1/analytics/carrier-patterns
 *
 * Follows the existing proxy pattern used for other SETTLE endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';

const SETTLE_BACKEND = process.env.NEXT_PUBLIC_SETTLE_API_URL || 'http://localhost:3008';
const SETTLE_API_KEY = process.env.NEXT_PUBLIC_SETTLE_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const qs = searchParams.toString();

  let url = `${SETTLE_BACKEND}/api/v1/analytics/carrier-patterns`;
  if (qs) url += `?${qs}`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-API-Key': SETTLE_API_KEY,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[settle/carrier-patterns] backend ${res.status}`);
      return NextResponse.json(
        { error: `SETTLE backend returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[settle/carrier-patterns] Backend unreachable:', msg);
    // Fallback: return empty response so the page renders gracefully
    return NextResponse.json({
      patterns: [],
      total_cases: 0,
      jurisdiction: null,
      case_type: null,
      methodology: 'Descriptive statistics from anonymized settlement contributions. Not predictive.',
      _fallback: true,
    });
  }
}
