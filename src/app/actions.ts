'use server';
import { createHash, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { tx } from '@/lib/db';
import { run, UserError } from '@/lib/action';
import { getCtx, requireUser, need, limit, log, notify, WS_COOKIE } from '@/lib/session';
import { customerSchema, projectSchema, taskSchema, invoiceSchema, paymentSchema, inviteSchema, workspaceSchema } from '@/lib/validators';
import { formatMoney } from '@/lib/money';
import { sendMail, mailLayout } from '@/lib/mail';

type In = Record<string, any>;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const must = (n: number | null, msg = 'Not found, or you do not have access.') => { if (!n) throw new UserError(msg); };
const refresh = () => revalidatePath('/', 'layout');
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

/* ───────── customers ───────── */
export async function saveCustomer(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin'); const v = customerSchema.parse(input);
  const id = await ctx.q(async c => {
    if (v.id) {
      must((await c.query(`update customers set name=$3, company=$4, email=$5, phone=$6, type=$7, status=$8, notes=coalesce($9, notes) where id=$1 and workspace_id=$2`, [v.id, ctx.ws.id, v.name, v.company, v.email, v.phone, v.type, v.status, v.notes])).rowCount);
      await log(c, ctx, 'customer.updated', 'customer', v.id, `updated customer ${v.name}`); return v.id;
    }
    const r = await c.query(`insert into customers (workspace_id,name,company,email,phone,type,status,notes,created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`, [ctx.ws.id, v.name, v.company, v.email, v.phone, v.type, v.status, v.notes, ctx.user.id]);
    await log(c, ctx, 'customer.created', 'customer', r.rows[0].id, `created customer ${v.name}`); return r.rows[0].id as string;
  });
  refresh(); return { id };
}); }
export async function saveCustomerNotes(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin');
  await ctx.q(async c => must((await c.query('update customers set notes=$3 where id=$1 and workspace_id=$2', [String(input.id), ctx.ws.id, String(input.notes ?? '').slice(0, 2000) || null])).rowCount));
  refresh();
}); }
export async function archiveCustomer(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin');
  await ctx.q(async c => { must((await c.query('update customers set archived_at=now(), status=$3 where id=$1 and workspace_id=$2', [String(input.id), ctx.ws.id, 'inactive'])).rowCount); await log(c, ctx, 'customer.archived', 'customer', String(input.id), 'archived a customer'); });
  refresh();
}); }

/* ───────── projects & tasks ───────── */
export async function saveProject(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin'); const v = projectSchema.parse(input);
  const id = await ctx.q(async c => {
    let id = v.id; const before = new Set<string>();
    if (id) {
      must((await c.query(`update projects set name=$3, customer_id=$4, description=$5, start_date=$6, due_date=$7, budget_minor=$8, status=$9 where id=$1 and workspace_id=$2`, [id, ctx.ws.id, v.name, v.customerId, v.description, v.startDate, v.dueDate, v.budget, v.status])).rowCount);
      (await c.query('select user_id from project_members where project_id=$1', [id])).rows.forEach(r => before.add(r.user_id));
      await c.query('delete from project_members where project_id=$1 and not (user_id = any($2))', [id, v.members]);
    } else {
      id = (await c.query(`insert into projects (workspace_id,customer_id,name,description,start_date,due_date,budget_minor,status,created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`, [ctx.ws.id, v.customerId, v.name, v.description, v.startDate, v.dueDate, v.budget, v.status, ctx.user.id])).rows[0].id;
    }
    for (const u of v.members.filter(u => !before.has(u))) {
      await c.query('insert into project_members (workspace_id, project_id, user_id) values ($1,$2,$3) on conflict do nothing', [ctx.ws.id, id, u]);
      await notify(c, ctx, u, 'task_assigned', `You were added to ${v.name}`, `/projects/${id}`);
    }
    await log(c, ctx, v.id ? 'project.updated' : 'project.created', 'project', id!, `${v.id ? 'updated' : 'created'} project "${v.name}"`);
    return id!;
  });
  refresh(); return { id };
}); }
export async function setProjectStatus(id: string, status: string) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin');
  if (!['planning', 'in_progress', 'on_hold', 'completed'].includes(status)) throw new UserError('Unknown status');
  await ctx.q(async c => { must((await c.query('update projects set status=$3 where id=$1 and workspace_id=$2', [id, ctx.ws.id, status])).rowCount); await log(c, ctx, 'project.status', 'project', id, `moved a project to ${status.replace('_', ' ')}`); });
  refresh();
}); }

export async function saveTask(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'write'); const v = taskSchema.parse(input);
  const id = await ctx.q(async c => {
    let id = v.id, prev: any = null;
    if (id) {
      prev = (await c.query('select assignee_id, status from tasks where id=$1 and workspace_id=$2', [id, ctx.ws.id])).rows[0]; if (!prev) throw new UserError('Task not found, or you do not have access.');
      must((await c.query(`update tasks set project_id=$3, title=$4, description=$5, assignee_id=$6, priority=$7, status=$8, due_date=$9 where id=$1 and workspace_id=$2`, [id, ctx.ws.id, v.projectId, v.title, v.description, v.assigneeId, v.priority, v.status, v.dueDate])).rowCount, "You can only edit tasks assigned to you.");
    } else id = (await c.query(`insert into tasks (workspace_id,project_id,title,description,assignee_id,priority,status,due_date,created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`, [ctx.ws.id, v.projectId, v.title, v.description, v.assigneeId, v.priority, v.status, v.dueDate, ctx.user.id])).rows[0].id;
    if (v.assigneeId && v.assigneeId !== prev?.assignee_id) await notify(c, ctx, v.assigneeId, 'task_assigned', `Task assigned: ${v.title}`, `/projects/${v.projectId}`);
    if (v.status === 'done' && prev?.status !== 'done') await log(c, ctx, 'task.completed', 'task', id!, `completed task "${v.title}"`);
    else await log(c, ctx, v.id ? 'task.updated' : 'task.created', 'task', id!, `${v.id ? 'updated' : 'created'} task "${v.title}"`);
    return id!;
  });
  refresh(); return { id };
}); }
export async function setTaskStatus(id: string, status: string) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'write');
  if (!['todo', 'in_progress', 'in_review', 'done'].includes(status)) throw new UserError('Unknown status');
  await ctx.q(async c => {
    const r = await c.query('update tasks set status=$3 where id=$1 and workspace_id=$2 returning title', [id, ctx.ws.id, status]);
    must(r.rowCount, 'You can only change the status of tasks assigned to you.');
    if (status === 'done') await log(c, ctx, 'task.completed', 'task', id, `completed task "${r.rows[0].title}"`);
  });
  refresh();
}); }
export async function deleteTask(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin');
  await ctx.q(async c => must((await c.query('delete from tasks where id=$1 and workspace_id=$2', [String(input.id), ctx.ws.id])).rowCount));
  refresh();
}); }

/* ───────── invoices & payments ───────── */
export async function saveInvoice(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin'); const v = invoiceSchema.parse(input);
  const id = await ctx.q(async c => {
    let id = v.id;
    if (id) {
      const cur = (await c.query('select sent_at from invoices where id=$1 and workspace_id=$2', [id, ctx.ws.id])).rows[0];
      if (!cur) throw new UserError('Invoice not found.'); if (cur.sent_at) throw new UserError('Issued invoices are locked. Void it and create a new one.');
      await c.query(`update invoices set customer_id=$3, project_id=$4, issue_date=$5, due_date=$6, discount_minor=$7, tax_bp=$8, notes=$9, terms=$10 where id=$1 and workspace_id=$2`, [id, ctx.ws.id, v.customerId, v.projectId, v.issueDate, v.dueDate, v.discount, v.taxBp, v.notes, v.terms]);
      await c.query('delete from invoice_items where invoice_id=$1', [id]);
    } else {
      const number = (await c.query('select next_invoice_number($1) n', [ctx.ws.id])).rows[0].n;
      id = (await c.query(`insert into invoices (workspace_id,customer_id,project_id,number,issue_date,due_date,discount_minor,tax_bp,notes,terms,created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`, [ctx.ws.id, v.customerId, v.projectId, number, v.issueDate, v.dueDate, v.discount, v.taxBp, v.notes, v.terms, ctx.user.id])).rows[0].id;
    }
    for (const [i, it] of v.items.entries()) await c.query('insert into invoice_items (workspace_id, invoice_id, position, description, quantity, unit_price_minor) values ($1,$2,$3,$4,$5,$6)', [ctx.ws.id, id, i, it.description, it.quantity, it.unit]);
    const sub = v.items.reduce((a, i) => a + i.quantity * i.unit, 0);
    if (v.discount > sub) throw new UserError('Discount cannot exceed the subtotal.', { discount: 'Discount cannot exceed the subtotal.' });
    await log(c, ctx, v.id ? 'invoice.updated' : 'invoice.created', 'invoice', id!, `${v.id ? 'updated' : 'created'} a draft invoice`);
    return id!;
  });
  refresh(); return { id };
}); }
export async function issueInvoice(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin');
  await ctx.q(async c => {
    const items = Number((await c.query('select count(*) n from invoice_items where invoice_id=$1', [String(input.id)])).rows[0].n); if (!items) throw new UserError('Add at least one line item first.');
    const r = await c.query('update invoices set sent_at=now() where id=$1 and workspace_id=$2 and sent_at is null and voided_at is null returning number', [String(input.id), ctx.ws.id]); must(r.rowCount, 'This invoice was already issued.');
    await log(c, ctx, 'invoice.issued', 'invoice', String(input.id), `issued invoice ${r.rows[0].number}`);
  });
  refresh();
}); }
export async function voidInvoice(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin');
  await ctx.q(async c => { const r = await c.query('update invoices set voided_at=now() where id=$1 and workspace_id=$2 returning number', [String(input.id), ctx.ws.id]); must(r.rowCount); await log(c, ctx, 'invoice.voided', 'invoice', String(input.id), `voided invoice ${r.rows[0].number}`); });
  refresh();
}); }
export async function deleteDraftInvoice(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin');
  await ctx.q(async c => must((await c.query('delete from invoices where id=$1 and workspace_id=$2', [String(input.id), ctx.ws.id])).rowCount, 'Only drafts can be deleted. Void issued invoices instead.'));
  refresh();
}); }
export async function recordPayment(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin'); await limit(ctx, 'payment', 30, 60); const v = paymentSchema.parse(input);
  await ctx.q(async c => {
    const r = await c.query('insert into payments (workspace_id, invoice_id, amount_minor, paid_on, method, reference, recorded_by) values ($1,$2,$3,$4,$5,$6,$7) returning id', [ctx.ws.id, v.invoiceId, v.amount, v.paidOn, v.method, v.reference, ctx.user.id]);
    const inv = (await c.query('select number, status from invoice_summary where id=$1', [v.invoiceId])).rows[0];
    await log(c, ctx, 'payment.recorded', 'payment', r.rows[0].id, `recorded ${formatMoney(v.amount, ctx.ws.currency)} on ${inv.number} (now ${inv.status.replace('_', ' ')})`);
  });
  refresh();
}); }

/* ───────── workspace, onboarding, settings ───────── */
export async function completeOnboarding(input: In) { return run(async () => {
  const user = await requireUser(); const name = String(input.fullName ?? '').trim(), ws = String(input.wsName ?? '').trim();
  if (!name) throw new UserError('Tell us your name.', { fullName: 'Your name is required.' });
  if (!ws) throw new UserError('Name your business.', { wsName: 'Business name is required.' });
  const currency = String(input.currency ?? 'NGN').toUpperCase(); if (!/^[A-Z]{3}$/.test(currency)) throw new UserError('Invalid currency');
  const id = await tx(user.id, async c => {
    await c.query('update profiles set full_name=$2, avatar_url=$3, goals=$4, onboarded=true where user_id=$1', [user.id, name, String(input.avatarUrl ?? '').trim() || null, (input.goals ?? []).slice(0, 4)]);
    const id = (await c.query('select create_workspace($1,$2,$3) id', [ws.slice(0, 80), String(input.businessType ?? '') || null, currency])).rows[0].id as string;
    const cn = String(input.customerName ?? '').trim(), pn = String(input.projectName ?? '').trim(), tn = String(input.taskTitle ?? '').trim();
    let cid: string | null = null, pid: string | null = null;
    if (cn) cid = (await c.query(`insert into customers (workspace_id,name,status,created_by) values ($1,$2,'active',$3) returning id`, [id, cn.slice(0, 120), user.id])).rows[0].id;
    if (pn && cid) { pid = (await c.query(`insert into projects (workspace_id,customer_id,name,status,due_date,created_by) values ($1,$2,$3,'in_progress',current_date+30,$4) returning id`, [id, cid, pn.slice(0, 120), user.id])).rows[0].id; await c.query('insert into project_members (workspace_id,project_id,user_id) values ($1,$2,$3)', [id, pid, user.id]); }
    if (tn && pid) await c.query(`insert into tasks (workspace_id,project_id,title,assignee_id,due_date,created_by) values ($1,$2,$3,$4,current_date+7,$4)`, [id, pid, tn.slice(0, 160), user.id]);
    await c.query(`insert into activity_logs (workspace_id,actor_id,action,entity_type,summary) values ($1,$2,'workspace.created','workspace',$3)`, [id, user.id, `created the workspace "${ws}"`]);
    return id;
  });
  await auth.api.updateUser({ body: { name }, headers: await headers() }).catch(() => {});
  (await cookies()).set(WS_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 31536000 });
  return { id };
}); }
export async function saveProfile(input: In) { return run(async () => {
  const user = await requireUser(); const name = String(input.fullName ?? '').trim(); if (!name) throw new UserError('Name is required.', { fullName: 'Name is required.' });
  await tx(user.id, c => c.query('update profiles set full_name=$2, avatar_url=$3 where user_id=$1', [user.id, name, String(input.avatarUrl ?? '').trim() || null]));
  await auth.api.updateUser({ body: { name }, headers: await headers() }); refresh();
}); }
export async function saveWorkspace(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin'); const v = workspaceSchema.parse(input);
  await ctx.q(async c => { must((await c.query(`update workspaces set name=$2, business_type=$3, currency=$4, address=$5, payment_instructions=$6, invoice_prefix=$7, default_tax_bp=$8 where id=$1`, [ctx.ws.id, v.name, v.businessType, v.currency, v.address, v.paymentInstructions, v.invoicePrefix, v.defaultTaxBp])).rowCount); await log(c, ctx, 'workspace.updated', 'workspace', null, 'updated workspace settings'); });
  refresh();
}); }
export async function saveNotifyPrefs(input: In) { return run(async () => {
  const user = await requireUser(); const p = { task_assigned: !!input.task_assigned, deadlines: !!input.deadlines, invoices: !!input.invoices, invites: !!input.invites };
  await tx(user.id, c => c.query('update profiles set notify=$2 where user_id=$1', [user.id, JSON.stringify(p)]));
}); }
export const switchWorkspace = async (id: string) => {
  const ctx = await getCtx(); if (!ctx.workspaces.some(w => w.id === id)) return;
  (await cookies()).set(WS_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 31536000 }); refresh();
};

/* ───────── team & invitations ───────── */
async function createInvite(ctx: Awaited<ReturnType<typeof getCtx>>, email: string, role: string) {
  const token = randomBytes(32).toString('hex');
  await ctx.q(async c => {
    if ((await c.query('select 1 from workspace_people where workspace_id=$1 and lower(email)=$2', [ctx.ws.id, email])).rowCount) throw new UserError('That person is already on the team.', { email: 'Already a member.' });
    await c.query('insert into workspace_invitations (workspace_id,email,role,token_hash,invited_by) values ($1,$2,$3,$4,$5)', [ctx.ws.id, email, role, sha(token), ctx.user.id]);
    await log(c, ctx, 'member.invited', 'member', null, `invited ${email} as ${role}`);
  });
  const url = `${appUrl()}/invite/${token}`;
  void sendMail(email, `${ctx.user.name} invited you to ${ctx.ws.name} on FlowDesk`, mailLayout(`Join ${ctx.ws.name}`, `${ctx.user.name} invited you as ${role}. The link expires in 7 days and only works for ${email}.`, url, 'Accept invitation'));
}
export async function inviteMember(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin'); await limit(ctx, 'invite', 10, 3600); const v = inviteSchema.parse(input);
  if (v.role === 'admin' && !ctx.isOwner) throw new UserError('Only the owner can invite admins.', { role: 'Only the owner can invite admins.' });
  await createInvite(ctx, v.email, v.role); refresh();
}); }
export async function resendInvite(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin'); await limit(ctx, 'invite', 10, 3600);
  const inv = await ctx.q(async c => { const r = await c.query('update workspace_invitations set revoked_at=now() where id=$1 and workspace_id=$2 and accepted_at is null and revoked_at is null returning email, role', [String(input.id), ctx.ws.id]); must(r.rowCount); return r.rows[0]; });
  await createInvite(ctx, inv.email, inv.role); refresh();
}); }
export async function revokeInvite(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin');
  await ctx.q(async c => must((await c.query('update workspace_invitations set revoked_at=now() where id=$1 and workspace_id=$2 and accepted_at is null', [String(input.id), ctx.ws.id])).rowCount)); refresh();
}); }
export async function changeRole(userId: string, role: string) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'owner'); if (!['admin', 'member', 'viewer'].includes(role)) throw new UserError('Unknown role');
  await ctx.q(async c => { must((await c.query('update workspace_members set role=$3 where workspace_id=$1 and user_id=$2', [ctx.ws.id, userId, role])).rowCount); await log(c, ctx, 'member.role', 'member', null, `changed a member's role to ${role}`); }); refresh();
}); }
export async function removeMember(input: In) { return run(async () => {
  const ctx = await getCtx(); need(ctx, 'admin');
  await ctx.q(async c => { must((await c.query('delete from workspace_members where workspace_id=$1 and user_id=$2', [ctx.ws.id, String(input.userId)])).rowCount, 'You cannot remove this member.'); await log(c, ctx, 'member.removed', 'member', null, 'removed a team member'); }); refresh();
}); }
export const previewInvite = async (token: string) => {
  const user = await requireUser();
  return tx(user.id, async c => (await c.query('select * from invitation_preview($1)', [sha(token)])).rows[0] ?? null);
};
export async function acceptInvite(token: string) { return run(async () => {
  const user = await requireUser();
  const id = await tx(user.id, async c => (await c.query('select accept_invitation($1) id', [sha(token)])).rows[0].id as string);
  (await cookies()).set(WS_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 31536000 });
  return { id };
}); }

/* ───────── notifications & demo ───────── */
export const markRead = async (id?: string) => {
  const ctx = await getCtx();
  await ctx.q(c => id ? c.query('update notifications set read_at=now() where id=$1 and read_at is null', [id]) : c.query('update notifications set read_at=now() where user_id=$1 and workspace_id=$2 and read_at is null', [ctx.user.id, ctx.ws.id]));
  revalidatePath('/', 'layout');
};
export async function demoLogin() { return run(async () => {
  const email = process.env.DEMO_EMAIL, password = process.env.DEMO_PASSWORD; if (!email || !password) throw new UserError('Demo login is not configured.');
  await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
}); }
