import { NextResponse } from 'next/server';
import { api, ApiError } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await api.fixtures.live();
    return NextResponse.json({ data });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
