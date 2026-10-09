import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCtx } from '@/lib/session';
import { search } from '@/lib/queries';

export async function GET(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json([], { status: 401 });
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json([]);
  return NextResponse.json(await search(await getCtx(), q), { headers: { 'Cache-Control': 'no-store' } });
}
