/**
 * API Route: GET /api/intake/recordings/[callSid]
 * 
 * Fetches call recording by call_sid
 */

import { NextRequest, NextResponse } from 'next/server';
import { tenantDb } from '@/lib/db/tenant-db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callSid: string }> }
) {
  try {
    const { callSid } = await params;
    
    const recording = await tenantDb.getRecordingByCallSid(callSid);

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ recording });
  } catch (error) {
    console.error('Error fetching recording:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recording', details: String(error) },
      { status: 500 }
    );
  }
}
