import { NextRequest, NextResponse } from 'next/server';

const DRAFT_SERVICE_URL = process.env.DRAFT_SERVICE_URL ?? 'http://localhost:3036';
const DRAFT_API_KEY = process.env.DRAFT_SERVICE_API_KEY ?? '';

export async function POST(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  // NOTE: Backend endpoint /leverage/case/{caseId}/deadlines/save does not exist yet.
  // Returning 503 until LEVERAGE service implements deadline endpoints.
  return NextResponse.json({ error: 'Deadline save not yet implemented on backend', saved: false }, { status: 503 });
}
