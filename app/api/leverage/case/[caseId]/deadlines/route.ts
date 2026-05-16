import { NextRequest, NextResponse } from 'next/server';

const DRAFT_SERVICE_URL = process.env.DRAFT_SERVICE_URL ?? 'http://localhost:3036';
const DRAFT_API_KEY = process.env.DRAFT_SERVICE_API_KEY ?? '';

export async function GET(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  // NOTE: Backend endpoint /leverage/case/{caseId}/deadlines does not exist yet.
  // Returning empty data until LEVERAGE service implements deadline endpoints.
  return NextResponse.json({ deadlines: [], _note: 'Backend endpoint not yet implemented' }, { status: 200 });
}
