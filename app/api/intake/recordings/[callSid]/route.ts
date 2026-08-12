/**
 * API Route: GET /api/intake/recordings/[callSid]
 * 
 * Proxies to INTAKE Tenant App API — no direct DB access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRecording } from '@/lib/api/intake-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callSid: string }> }
) {
  try {
    const { callSid } = await params;
    
    const recording = await getRecording(callSid);

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not available — INTAKE projection API unreachable' },
        { status: 503 }
      );
    }

    return NextResponse.json({ recording });
  } catch (error) {
    console.error('Error fetching recording:', error);
    return NextResponse.json(
      { error: 'Recording service unavailable' },
      { status: 503 }
    );
  }
}
