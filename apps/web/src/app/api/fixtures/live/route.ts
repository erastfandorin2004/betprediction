import { NextResponse } from 'next/server';
import { api, ApiError } from '@/lib/api-client';

// force-static — требование output:'export'. В `next dev` хендлер всё равно
// выполняется по запросу; в статике отдаёт пустой ответ (бэкенда нет).
export const dynamic = 'force-static';
const STATIC = process.env['NEXT_PUBLIC_STATIC'] === 'true';

export async function GET() {
  if (STATIC) return NextResponse.json({ data: [] });
  try {
    const data = await api.fixtures.live();
    return NextResponse.json({ data });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status });
  }
}
