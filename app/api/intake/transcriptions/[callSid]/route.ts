/**
 * API Route: GET /api/intake/transcriptions/[callSid]
 * 
 * Proxies to INTAKE Tenant App API — no direct DB access.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTranscription } from '@/lib/api/intake-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callSid: string }> }
) {
  try {
    const { callSid } = await params;
    
    const transcription = await getTranscription(callSid);

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not available — INTAKE projection API unreachable' },
        { status: 503 }
      );
    }

    return NextResponse.json({ transcription });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json(
      { error: 'Transcription service unavailable' },
      { status: 503 }
    );
  }
}
