import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getCtx } from '@/lib/session';
import { exportRows } from '@/lib/queries';
import { toCsv } from '@/lib/csv';
import { addDays, today } from '@/lib/dates';

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ctx = await getCtx(); const { key } = await params; const sp = req.nextUrl.searchParams;
  const date = (v: string | null, d: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : d);
  const out = await exportRows(ctx, key, date(sp.get('from'), addDays(today(), -365)), date(sp.get('to'), today()));
  if (!out) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return new NextResponse(toCsv(out.columns, out.rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="flowdesk-${key}-${today()}.csv"`, 'Cache-Control': 'no-store' } });
}
