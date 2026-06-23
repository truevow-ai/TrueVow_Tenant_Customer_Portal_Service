import { NextRequest, NextResponse } from 'next/server';

const SETTLE_URL = process.env.SETTLE_SERVICE_URL || 'http://localhost:3041';
const SETTLE_KEY = process.env.SETTLE_SERVICE_API_KEY || '';

// GET /api/settle/reports  returns reports list for the authenticated tenant
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(SETTLE_URL + '/api/v1/reports/my-reports', {
      method: 'GET',
      headers: { 'X-API-Key': SETTLE_KEY },
    });
    const data = await res.json().catch(() => ([]));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'SETTLE service unavailable' }, { status: 503 });
  }
}

// POST /api/settle/reports  generates a new report
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(SETTLE_URL + '/api/v1/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': SETTLE_KEY },
      body: JSON.stringify(body),
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/pdf')) {
      const pdfBuffer = await res.arrayBuffer();
      return new NextResponse(pdfBuffer, {
        status: res.status,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': res.headers.get('content-disposition') || 'attachment; filename="settle-report.pdf"',
        },
      });
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'SETTLE service unavailable' }, { status: 503 });
  }
}
