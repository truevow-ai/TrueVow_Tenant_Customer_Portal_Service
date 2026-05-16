/**
 * POST /api/analytics/track
 *
 * Same-origin proxy: receives behavioral events from the Customer Portal
 * frontend, forwards them to SaaS Admin with X-API-Key header.
 * The API key never reaches the browser.
 * Always returns 200 - analytics failure must never surface to attorney UI.
 */

import { NextRequest, NextResponse } from 'next/server'

const SAAS_ADMIN_URL = process.env.SAAS_ADMINISTRATION_SERVICE_URL
  || process.env.PLATFORM_SERVICE_API_URL
  || 'http://localhost:3001'

const SAAS_API_KEY = process.env.SAAS_ADMINISTRATION_SERVICE_API_KEY
  || process.env.PLATFORM_SERVICE_API_KEY
  || ''

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text()

    const res = await fetch(
      `${SAAS_ADMIN_URL}/api/v1/analytics/portal-events`,
      {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key':    SAAS_API_KEY,
        },
        body,
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!res.ok) {
      console.warn('[analytics/track] upstream returned', res.status)
    }
  } catch {
    console.warn('[analytics/track] upstream unreachable')
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
