import { NextRequest, NextResponse } from 'next/server';

const DRAFT_SERVICE_URL = process.env.DRAFT_SERVICE_URL ?? 'http://localhost:3036';
const DRAFT_API_KEY = process.env.DRAFT_SERVICE_API_KEY ?? '';

export async function GET(
  req: NextRequest,
  { params }: { params: { caseId: string } }
) {
  const { caseId } = params;
  try {
    const res = await fetch(
      `${DRAFT_SERVICE_URL}/api/v1/leverage/case/${encodeURIComponent(caseId)}/events`,
      {
        headers: {
          'X-API-Key': DRAFT_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ events: [] }, { status: 200 });
  }
}
