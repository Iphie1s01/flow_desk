import { NextRequest, NextResponse } from 'next/server';
import { getSession, getCtx, log } from '@/lib/session';
import { signDownload, headObject, deleteObject, storageEnabled } from '@/lib/storage';

type P = { params: Promise<{ id: string }> };
const uuid = /^[0-9a-f-]{36}$/i;

/** Download: database permission check first, then a 60-second signed URL. */
export async function GET(_: NextRequest, { params }: P) {
  const { id } = await params;
  if (!(await getSession()) || !uuid.test(id) || !storageEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const ctx = await getCtx();
  const f = await ctx.q(async c => (await c.query(`select storage_key, file_name from attachments where id=$1 and workspace_id=$2 and status='ready'`, [id, ctx.ws.id])).rows[0]);
  if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.redirect(await signDownload(f.storage_key, f.file_name), { headers: { 'Cache-Control': 'no-store' } });
}
/** Step 2 of an upload: confirm the object really exists with the declared size before marking it ready. */
export async function PATCH(_: NextRequest, { params }: P) {
  const { id } = await params;
  if (!(await getSession()) || !uuid.test(id) || !storageEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const ctx = await getCtx();
  const f = await ctx.q(async c => (await c.query(`select storage_key, size_bytes, file_name, project_id from attachments where id=$1 and workspace_id=$2 and uploaded_by=$3`, [id, ctx.ws.id, ctx.user.id])).rows[0]);
  if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const head = await headObject(f.storage_key).catch(() => null);
  if (!head || head.ContentLength !== f.size_bytes) { await ctx.q(c => c.query('delete from attachments where id=$1', [id])); return NextResponse.json({ error: 'Upload incomplete.' }, { status: 400 }); }
  await ctx.q(async c => { await c.query(`update attachments set status='ready' where id=$1`, [id]); await log(c, ctx, 'file.uploaded', 'project', f.project_id, `uploaded ${f.file_name}`); });
  return NextResponse.json({ ok: true });
}
export async function DELETE(_: NextRequest, { params }: P) {
  const { id } = await params;
  if (!(await getSession()) || !uuid.test(id) || !storageEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const ctx = await getCtx();
  const key = await ctx.q(async c => (await c.query('delete from attachments where id=$1 and workspace_id=$2 returning storage_key', [id, ctx.ws.id])).rows[0]?.storage_key);   // RLS: admin or uploader
  if (!key) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await deleteObject(key).catch(() => {});
  return NextResponse.json({ ok: true });
}
