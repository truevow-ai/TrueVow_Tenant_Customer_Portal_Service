/**
 * Health check endpoint — GET /api/health
 *
 * Probes runtime readiness:
 *   - Next.js routing is functional
 *   - Server is responding
 *   - No downstream dependency check (health is self-contained)
 *
 * Used by Fly.io health checks and load balancer probes.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'truevow-customer-portal',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Health-Check': 'true',
      },
    }
  );
}
