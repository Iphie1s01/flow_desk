import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getSession, getCtx, limit, log } from '@/lib/session';
import { FILE_TYPES, MAX_FILE_BYTES } from '@/lib/constants';
import { signUpload, storageEnabled } from '@/lib/storage';

const body = z.object({ projectId: z.string().uuid(), fileName: z.string().trim().min(1).max(160), contentType: z.string(), size: z.number().int().min(1).max(MAX_FILE_BYTES) });

/** Step 1 of an upload: permission check + pending row + 60-second signed PUT URL. */
export async function POST(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!storageEnabled()) return NextResponse.json({ error: 'File storage is not configured (set the R2_* variables).' }, { status: 501 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid upload request (max 10 MB).' }, { status: 400 });
  const { projectId, fileName, contentType, size } = parsed.data;
  if (!FILE_TYPES[contentType]) return NextResponse.json({ error: 'This file type is not allowed.' }, { status: 415 });
  const ctx = await getCtx();
  if (!ctx.canWrite) return NextResponse.json({ error: 'Read-only account.' }, { status: 403 });
  try { await limit(ctx, 'upload', 30, 60); } catch { return NextResponse.json({ error: 'Too many uploads. Wait a minute.' }, { status: 429 }); }
  const key = `${ctx.ws.id}/${projectId}/${randomUUID()}.${FILE_TYPES[contentType]}`;
  try {
    const id = await ctx.q(async c => {
      const visible = await c.query('select 1 from projects where id=$1 and workspace_id=$2', [projectId, ctx.ws.id]);   // RLS: members only see their own projects
      if (!visible.rowCount) throw Object.assign(new Error('nope'), { code: '42501' });
      const r = await c.query('insert into attachments (workspace_id, project_id, storage_key, file_name, content_type, size_bytes, uploaded_by) values ($1,$2,$3,$4,$5,$6,$7) returning id', [ctx.ws.id, projectId, key, fileName, contentType, size, ctx.user.id]);
      return r.rows[0].id as string;
    });
    return NextResponse.json({ id, url: await signUpload(key, contentType, size) });
  } catch (e: any) {
    if (e?.code === '42501') return NextResponse.json({ error: 'You do not have access to this project.' }, { status: 403 });
    console.error(e); return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}
