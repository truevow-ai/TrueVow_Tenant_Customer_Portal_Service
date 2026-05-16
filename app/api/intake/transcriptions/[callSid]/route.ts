/**
 * API Route: GET /api/intake/transcriptions/[callSid]
 * 
 * Fetches call transcription by call_sid
 */

import { NextRequest, NextResponse } from 'next/server';
import { tenantDb } from '@/lib/db/tenant-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callSid: string }> }
) {
  try {
    const { callSid } = await params;
    
    const transcription = await tenantDb.getTranscriptionByCallSid(callSid);

    if (!transcription) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ transcription });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcription', details: String(error) },
      { status: 500 }
    );
  }
}
