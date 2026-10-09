import type { Ctx } from "./session";
type Row = Record<string, any>;
export const PAGE = 10;
const like = (s: string) => "%" + s.replace(/[\\%_]/g, (m) => "\\" + m) + "%";
const num = (v: unknown, d = 1) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

/** Tiny WHERE builder: pushes params and returns "$n" placeholders. */
function where(base: string, params: any[]) {
  const parts = [base];
  return {
    add: (sql: string, ...vals: any[]) => {
      let s = sql;
      vals.forEach((v) => {
        params.push(v);
        s = s.replace("?", "$" + params.length);
      });
      parts.push(s);
    },
    sql: () => parts.join(" and "),
  };
}

export async function listCustomers(ctx: Ctx, sp: Row) {
  const page = num(sp.page);
  const params: any[] = [ctx.ws.id];
  const w = where("c.workspace_id = $1 and c.archived_at is null", params);
  if (sp.status) w.add("c.status = ?", sp.status);
  if (sp.q)
    w.add(
      "(c.name ilike ? or c.company ilike ? or c.email ilike ?)",
      like(sp.q),
      like(sp.q),
      like(sp.q),
    );
  const order =
    sp.sort === "billed"
      ? "billed desc"
      : sp.sort === "recent"
        ? "c.created_at desc"
        : "lower(c.name)";
  return ctx.q(async (c) => {
    const total = Number(
      (
        await c.query(
          `select count(*) n from customers c where ${w.sql()}`,
          params,
        )
      ).rows[0].n,
    );
    const rows = (
      await c.query(
        `select c.*, (select count(*) from projects p where p.customer_id = c.id)::int projects,
      coalesce((select sum(s.total_minor) from invoice_summary s where s.customer_id = c.id and s.status not in ('draft','void')),0)::bigint billed
      from customers c where ${w.sql()} order by ${order} limit ${PAGE} offset ${(page - 1) * PAGE}`,
        params,
      )
    ).rows;
    return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE)) };
  });
}

export async function getCustomer(ctx: Ctx, id: string) {
  return ctx.q(async (c) => {
    const cust = (
      await c.query(
        "select * from customers where id = $1 and workspace_id = $2",
        [id, ctx.ws.id],
      )
    ).rows[0];
    if (!cust) return null;
    const projects = (
      await c.query(
        `select p.id, p.name, p.status, p.due_date, p.budget_minor from projects p where p.customer_id = $1 order by p.due_date`,
        [id],
      )
    ).rows;
    const invoices = (
      await c.query(
        `select id, number, issue_date, due_date, total_minor, paid_minor, balance_minor, status from invoice_summary where customer_id = $1 order by issue_date desc`,
        [id],
      )
    ).rows;
    const activity = (
      await c.query(
        `select a.summary, a.created_at from activity_logs a where a.workspace_id = $1 and a.entity_id = $2 order by a.created_at desc limit 20`,
        [ctx.ws.id, id],
      )
    ).rows;
    return { cust, projects, invoices, activity };
  });
}

export const customerOptions = (ctx: Ctx) =>
  ctx.q(
    async (c) =>
      (
        await c.query(
          `select id as value, name || coalesce(' · ' || company, '') as label from customers where workspace_id = $1 and archived_at is null order by lower(name)`,
          [ctx.ws.id],
        )
      ).rows,
  );
export const memberOptions = (ctx: Ctx) =>
  ctx.q(
    async (c) =>
      (
        await c.query(
          `select user_id as value, name as label from workspace_people where workspace_id = $1 order by name`,
          [ctx.ws.id],
        )
      ).rows,
  );
export const projectOptions = (ctx: Ctx) =>
  ctx.q(
    async (c) =>
      (
        await c.query(
          `select id as value, name as label from projects where workspace_id = $1 order by name`,
          [ctx.ws.id],
        )
      ).rows,
  );

export async function listProjects(ctx: Ctx, sp: Row) {
  const params: any[] = [ctx.ws.id];
  const w = where("p.workspace_id = $1", params);
  if (sp.q) w.add("(p.name ilike ? or c.name ilike ?)", like(sp.q), like(sp.q));
  return ctx.q(
    async (c) =>
      (
        await c.query(
          `select p.*, c.name customer_name, c.company customer_company,
      (select count(*) from tasks t where t.project_id = p.id)::int tasks, (select count(*) from tasks t where t.project_id = p.id and t.status = 'done')::int done,
      coalesce((select json_agg(json_build_object('id', w.user_id, 'name', w.name) order by w.name) from project_members pm join workspace_people w on w.user_id = pm.user_id and w.workspace_id = pm.workspace_id where pm.project_id = p.id), '[]') members
      from projects p join customers c on c.id = p.customer_id where ${w.sql()} order by p.due_date`,
          params,
        )
      ).rows,
  );
}

export async function getProject(ctx: Ctx, id: string) {
  return ctx.q(async (c) => {
    const p = (
      await c.query(
        `select p.*, c.name customer_name, c.company customer_company from projects p join customers c on c.id = p.customer_id where p.id = $1 and p.workspace_id = $2`,
        [id, ctx.ws.id],
      )
    ).rows[0];
    if (!p) return null;
    const members = (
      await c.query(
        `select w.user_id, w.name from project_members pm join workspace_people w on w.user_id = pm.user_id and w.workspace_id = pm.workspace_id where pm.project_id = $1 order by w.name`,
        [id],
      )
    ).rows;
    const tasks = (await taskQuery(c, ctx, { project: id })).rows;
    const files = (
      await c.query(
        `select id, file_name, content_type, size_bytes, created_at, uploaded_by from attachments where project_id = $1 and status = 'ready' order by created_at desc`,
        [id],
      )
    ).rows;
    const invoices = ctx.canFinance
      ? (
          await c.query(
            `select id, number, total_minor, paid_minor, balance_minor, status, issue_date from invoice_summary where project_id = $1 order by issue_date desc`,
            [id],
          )
        ).rows
      : [];
    const activity = (
      await c.query(
        `select a.summary, a.created_at, w.name actor from activity_logs a left join workspace_people w on w.user_id = a.actor_id and w.workspace_id = a.workspace_id
       where a.workspace_id = $1 and (a.entity_id = $2 or a.entity_id in (select id from tasks where project_id = $2)) order by a.created_at desc limit 25`,
        [ctx.ws.id, id],
      )
    ).rows;
    return { p, members, tasks, files, invoices, activity };
  });
}

async function taskQuery(
  c: any,
  ctx: Ctx,
  f: {
    q?: string;
    priority?: string;
    status?: string;
    mine?: boolean;
    project?: string;
  },
) {
  const params: any[] = [ctx.ws.id];
  const w = where("t.workspace_id = $1", params);
  if (f.q) w.add("t.title ilike ?", like(f.q));
  if (f.priority) w.add("t.priority = ?", f.priority);
  if (f.status === "overdue")
    w.add("t.status <> 'done' and t.due_date < current_date");
  else if (f.status) w.add("t.status = ?", f.status);
  if (f.mine) w.add("t.assignee_id = ?", ctx.user.id);
  if (f.project) w.add("t.project_id = ?", f.project);
  return c.query(
    `select t.*, p.name project_name, wp.name assignee_name from tasks t join projects p on p.id = t.project_id
     left join workspace_people wp on wp.user_id = t.assignee_id and wp.workspace_id = t.workspace_id
     where ${w.sql()} order by (t.status = 'done'), t.due_date nulls last, t.created_at desc limit 300`,
    params,
  );
}
export const listTasks = (ctx: Ctx, sp: Row) =>
  ctx.q(
    async (c) =>
      (
        await taskQuery(c, ctx, {
          q: sp.q,
          priority: sp.priority,
          status: sp.status,
          mine: sp.mine === "1",
        })
      ).rows,
  );

export async function listInvoices(ctx: Ctx, sp: Row) {
  const page = num(sp.page);
  const params: any[] = [ctx.ws.id];
  const w = where("workspace_id = $1", params);
  if (sp.status) w.add("status = ?", sp.status);
  if (sp.q)
    w.add("(number ilike ? or customer_name ilike ?)", like(sp.q), like(sp.q));
  return ctx.q(async (c) => {
    const total = Number(
      (
        await c.query(
          `select count(*) n from invoice_summary where ${w.sql()}`,
          params,
        )
      ).rows[0].n,
    );
    const rows = (
      await c.query(
        `select id, number, customer_name, issue_date, due_date, total_minor, paid_minor, balance_minor, status from invoice_summary where ${w.sql()} order by issue_date desc, number desc limit ${PAGE} offset ${(page - 1) * PAGE}`,
        params,
      )
    ).rows;
    return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE)) };
  });
}

export async function getInvoice(ctx: Ctx, id: string) {
  return ctx.q(async (c) => {
    const inv = (
      await c.query(
        `select s.*, cu.email customer_email, cu.phone customer_phone from invoice_summary s join customers cu on cu.id = s.customer_id where s.id = $1 and s.workspace_id = $2`,
        [id, ctx.ws.id],
      )
    ).rows[0];
    if (!inv) return null;
    const items = (
      await c.query(
        "select * from invoice_items where invoice_id = $1 order by position",
        [id],
      )
    ).rows;
    const payments = (
      await c.query(
        "select * from payments where invoice_id = $1 order by paid_on, created_at",
        [id],
      )
    ).rows;
    return { inv, items, payments };
  });
}

export async function listPayments(ctx: Ctx, sp: Row) {
  const page = num(sp.page);
  const params: any[] = [ctx.ws.id];
  const w = where("p.workspace_id = $1", params);
  if (sp.method) w.add("p.method = ?", sp.method);
  if (sp.from) w.add("p.paid_on >= ?", sp.from);
  if (sp.to) w.add("p.paid_on <= ?", sp.to);
  if (sp.q)
    w.add(
      "(i.number ilike ? or c.name ilike ? or p.reference ilike ?)",
      like(sp.q),
      like(sp.q),
      like(sp.q),
    );
  return ctx.q(async (c) => {
    const base = `from payments p join invoices i on i.id = p.invoice_id join customers c on c.id = i.customer_id where ${w.sql()}`;
    const t = (
      await c.query(
        `select count(*) n, coalesce(sum(p.amount_minor),0) sum ${base}`,
        params,
      )
    ).rows[0];
    const rows = (
      await c.query(
        `select p.id, p.invoice_id, i.number, c.name customer_name, p.amount_minor, p.paid_on, p.method, p.reference ${base} order by p.paid_on desc, p.created_at desc limit ${PAGE} offset ${(page - 1) * PAGE}`,
        params,
      )
    ).rows;
    return {
      rows,
      total: Number(t.n),
      sum: Number(t.sum),
      page,
      pages: Math.max(1, Math.ceil(Number(t.n) / PAGE)),
    };
  });
}

export async function getTeam(ctx: Ctx) {
  return ctx.q(async (c) => {
    const members = (
      await c.query(
        `select w.user_id, w.name, w.email, w.role, w.joined_at,
        (select count(*) from project_members pm where pm.user_id = w.user_id and pm.workspace_id = w.workspace_id)::int projects
        from workspace_people w where w.workspace_id = $1 order by (w.role = 'owner') desc, w.name`,
        [ctx.ws.id],
      )
    ).rows;
    const invites = ctx.isAdmin
      ? (
          await c.query(
            `select id, email, role, expires_at from workspace_invitations where workspace_id = $1 and accepted_at is null and revoked_at is null order by created_at desc`,
            [ctx.ws.id],
          )
        ).rows
      : [];
    return { members, invites };
  });
}

export async function listActivity(ctx: Ctx, sp: Row) {
  const page = num(sp.page);
  const params: any[] = [ctx.ws.id];
  const w = where("a.workspace_id = $1", params);
  if (sp.type) w.add("a.entity_type = ?", sp.type);
  return ctx.q(async (c) => {
    const total = Number(
      (
        await c.query(
          `select count(*) n from activity_logs a where ${w.sql()}`,
          params,
        )
      ).rows[0].n,
    );
    const rows = (
      await c.query(
        `select a.id, a.summary, a.entity_type, a.entity_id, a.created_at, p.name actor from activity_logs a left join workspace_people p on p.user_id = a.actor_id and p.workspace_id = a.workspace_id
        where ${w.sql()} order by a.created_at desc limit 25 offset ${(page - 1) * 25}`,
        params,
      )
    ).rows;
    return { rows, total, page, pages: Math.max(1, Math.ceil(total / 25)) };
  });
}

/** Deadline notifications are generated lazily and de-duplicated by (user, dedupe_key). */
export async function syncDeadlineNotifications(ctx: Ctx) {
  await ctx.q(async (c) => {
    await c.query(
      `insert into notifications (workspace_id, user_id, type, title, href, dedupe_key)
      select t.workspace_id, $2, 'deadlines', case when t.due_date < current_date then 'Overdue: ' else 'Due soon: ' end || t.title, '/projects/' || t.project_id,
             case when t.due_date < current_date then 'task-overdue:' else 'task-soon:' end || t.id
      from tasks t where t.workspace_id = $1 and t.assignee_id = $2 and t.status <> 'done' and t.due_date <= current_date + 2
        and coalesce((select (notify ->> 'deadlines')::boolean from profiles where user_id = $2), true)
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing`,
      [ctx.ws.id, ctx.user.id],
    );
    if (ctx.isAdmin)
      await c.query(
        `insert into notifications (workspace_id, user_id, type, title, href, dedupe_key)
      select s.workspace_id, $2, 'invoices', s.number || ' is overdue', '/invoices/' || s.id, 'inv-overdue:' || s.id from invoice_summary s
      where s.workspace_id = $1 and s.status = 'overdue' and coalesce((select (notify ->> 'invoices')::boolean from profiles where user_id = $2), true)
      on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing`,
        [ctx.ws.id, ctx.user.id],
      );
  });
}
export const getNotifications = (ctx: Ctx) =>
  ctx.q(async (c) => {
    const rows = (
      await c.query(
        `select id, title, href, read_at, created_at from notifications where user_id = $1 and workspace_id = $2 order by created_at desc limit 15`,
        [ctx.user.id, ctx.ws.id],
      )
    ).rows;
    const unread = Number(
      (
        await c.query(
          `select count(*) n from notifications where user_id = $1 and workspace_id = $2 and read_at is null`,
          [ctx.user.id, ctx.ws.id],
        )
      ).rows[0].n,
    );
    return { rows, unread };
  });

export async function search(ctx: Ctx, term: string) {
  const p = like(term);
  return ctx.q(
    async (c) =>
      (
        await c.query(
          `
    (select 'Customer' kind, id, name title, company sub, '/customers/' || id href from customers where workspace_id = $1 and archived_at is null and (name ilike $2 or company ilike $2 or email ilike $2) limit 5)
    union all (select 'Project', id, name, null, '/projects/' || id from projects where workspace_id = $1 and name ilike $2 limit 5)
    union all (select 'Task', id, title, null, '/projects/' || project_id from tasks where workspace_id = $1 and title ilike $2 limit 5)
    ${ctx.canFinance ? `union all (select 'Invoice', id, number, customer_name, '/invoices/' || id from invoice_summary where workspace_id = $1 and (number ilike $2 or customer_name ilike $2) limit 5)` : ""}`,
          [ctx.ws.id, p],
        )
      ).rows,
  );
}

export async function overview(ctx: Ctx, daysRaw: unknown) {
  const days = [30, 90, 365].includes(Number(daysRaw)) ? Number(daysRaw) : 30;
  const unit = days > 90 ? "month" : "week";
  return ctx.q(async (c) => {
    const w = ctx.ws.id,
      one = async (sql: string, p: any[]) => (await c.query(sql, p)).rows[0];
    const proj = await one(
      `select count(*) filter (where status = 'in_progress')::int active, count(*) filter (where status = 'in_progress' and due_date < current_date)::int overdue,
        count(*) filter (where status = 'completed' and completed_at > now() - $2 * interval '1 day')::int completed from projects where workspace_id = $1`,
      [w, days],
    );
    const cust = await one(
      `select count(*) filter (where status = 'active')::int active, count(*) filter (where created_at > now() - $2 * interval '1 day')::int fresh from customers where workspace_id = $1 and archived_at is null`,
      [w, days],
    );
    const tasks = await one(
      `select count(*) filter (where status <> 'done' and assignee_id = $2)::int mine, count(*) filter (where status <> 'done' and assignee_id = $2 and due_date < current_date)::int mine_overdue,
        count(*) filter (where status <> 'done' and due_date < current_date)::int overdue from tasks where workspace_id = $1`,
      [w, ctx.user.id],
    );
    const stale = (
      await c.query(
        `select p.id, p.name from projects p where p.workspace_id = $1 and p.status = 'in_progress' and not exists (select 1 from tasks t where t.project_id = p.id and t.updated_at > now() - interval '21 days')`,
        [w],
      )
    ).rows;
    const progress = (
      await c.query(
        `select p.id, p.name, p.due_date, c.name customer, count(t.id)::int total, count(t.id) filter (where t.status = 'done')::int done
        from projects p join customers c on c.id = p.customer_id left join tasks t on t.project_id = p.id where p.workspace_id = $1 and p.status = 'in_progress' group by p.id, c.name order by p.due_date limit 6`,
        [w],
      )
    ).rows;
    const deadlines = (
      await c.query(
        `(select 'task' kind, t.id, t.title, p.name sub, t.due_date, '/projects/' || t.project_id href from tasks t join projects p on p.id = t.project_id
          where t.workspace_id = $1 and t.status <> 'done' and t.due_date <= current_date + 7 and ($2::text is null or t.assignee_id = $2))
        union all (select 'project', id, name, 'Project deadline', due_date, '/projects/' || id from projects where workspace_id = $1 and status = 'in_progress' and due_date <= current_date + 14 and $3::boolean)
        order by due_date limit 7`,
        [w, ctx.canFinance ? null : ctx.user.id, ctx.canFinance],
      )
    ).rows;
    if (!ctx.canFinance)
      return {
        days,
        unit,
        proj,
        cust,
        tasks,
        stale,
        progress,
        deadlines,
        fin: null,
      };
    const rev = await one(
      `select coalesce(sum(amount_minor) filter (where paid_on > current_date - $2::int), 0)::bigint cur,
        coalesce(sum(amount_minor) filter (where paid_on <= current_date - $2::int and paid_on > current_date - 2 * $2::int), 0)::bigint prev from payments where workspace_id = $1`,
      [w, days],
    );
    const series = (
      await c.query(
        `select date_trunc('${unit}', paid_on)::date::text d, sum(amount_minor)::bigint v from payments where workspace_id = $1 and paid_on > current_date - $2::int group by 1 order by 1`,
        [w, days],
      )
    ).rows;
    const inv = await one(
      `select count(*) filter (where status in ('sent','partially_paid','overdue'))::int unpaid, count(*) filter (where status = 'overdue')::int overdue,
        coalesce(sum(balance_minor) filter (where status in ('sent','partially_paid','overdue')), 0)::bigint outstanding, coalesce(sum(balance_minor) filter (where status = 'overdue'), 0)::bigint overdue_amount from invoice_summary where workspace_id = $1`,
      [w],
    );
    const recent = (
      await c.query(
        `select id, number, customer_name, issue_date, total_minor, status from invoice_summary where workspace_id = $1 and status <> 'draft' order by issue_date desc, created_at desc limit 6`,
        [w],
      )
    ).rows;
    return {
      days,
      unit,
      proj,
      cust,
      tasks,
      stale,
      progress,
      deadlines,
      fin: { rev, series, inv, recent },
    };
  });
}

/** Report queries. Revenue = collected payments; "invoiced" = issued, non-void invoices. Profit is deliberately not computed. */
export async function reportData(ctx: Ctx, from: string, to: string) {
  return ctx.q(async (c) => {
    const w = ctx.ws.id,
      q = async (sql: string, p: any[]) => (await c.query(sql, p)).rows;
    const len = Math.max(
      1,
      Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1,
    );
    const [cmp] = await q(
      `select coalesce(sum(amount_minor) filter (where paid_on between $2 and $3),0)::bigint cur,
        coalesce(sum(amount_minor) filter (where paid_on between ($2::date - $4::int) and ($2::date - 1)),0)::bigint prev from payments where workspace_id = $1`,
      [w, from, to, len],
    );
    const byMonth = await q(
      `select to_char(date_trunc('month', paid_on), 'YYYY-MM') label, sum(amount_minor)::bigint value from payments where workspace_id = $1 and paid_on between $2 and $3 group by 1 order by 1`,
      [w, from, to],
    );
    const byCustomer = await q(
      `select c.name label, sum(p.amount_minor)::bigint value from payments p join invoices i on i.id = p.invoice_id join customers c on c.id = i.customer_id where p.workspace_id = $1 and p.paid_on between $2 and $3 group by c.name order by 2 desc limit 8`,
      [w, from, to],
    );
    const byProject = await q(
      `select coalesce(pr.name, 'No project') label, sum(p.amount_minor)::bigint value from payments p join invoices i on i.id = p.invoice_id left join projects pr on pr.id = i.project_id where p.workspace_id = $1 and p.paid_on between $2 and $3 group by 1 order by 2 desc limit 8`,
      [w, from, to],
    );
    const invStatus = await q(
      `select status label, count(*)::int count, coalesce(sum(total_minor),0)::bigint total, coalesce(sum(balance_minor),0)::bigint balance from invoice_summary where workspace_id = $1 and issue_date between $2 and $3 and status <> 'draft' group by status order by status`,
      [w, from, to],
    );
    const [avg] = await q(
      `select round(avg(x.last_paid - x.issue_date), 1)::float days from (select s.id, s.issue_date, max(p.paid_on) last_paid from invoice_summary s join payments p on p.invoice_id = s.id where s.workspace_id = $1 and s.status = 'paid' and s.issue_date between $2 and $3 group by s.id, s.issue_date) x`,
      [w, from, to],
    );
    const [pr] = await q(
      `select count(*) filter (where status = 'completed' and completed_at::date between $2 and $3)::int completed, count(*) filter (where status = 'completed' and completed_at::date between $2 and $3 and completed_at::date <= due_date)::int on_time,
        count(*) filter (where status = 'in_progress')::int active, count(*) filter (where status = 'in_progress' and due_date < current_date)::int overdue from projects where workspace_id = $1`,
      [w, from, to],
    );
    const taskRows = await q(
      `select coalesce(wp.name, 'Unassigned') label, count(*) filter (where t.status = 'done' and t.completed_at::date between $2 and $3)::int done, count(*) filter (where t.status <> 'done')::int open,
        count(*) filter (where t.status <> 'done' and t.due_date < current_date)::int overdue from tasks t left join workspace_people wp on wp.user_id = t.assignee_id and wp.workspace_id = t.workspace_id where t.workspace_id = $1 group by 1 order by 1`,
      [w, from, to],
    );
    return {
      cmp,
      byMonth,
      byCustomer,
      byProject,
      invStatus,
      avg: avg?.days ?? null,
      pr,
      taskRows,
    };
  });
}

/** CSV exports. Each runs under the caller's RLS context, so a member can never export finance data. */
export async function exportRows(
  ctx: Ctx,
  key: string,
  from: string,
  to: string,
): Promise<{ columns: string[]; rows: Row[] } | null> {
  const w = ctx.ws.id;
  const defs: Record<
    string,
    { fin: boolean; columns: string[]; sql: string; p: any[] }
  > = {
    customers: {
      fin: false,
      columns: ["name", "company", "email", "phone", "status", "created"],
      sql: `select name, company, email, phone, status, created_at::date created from customers where workspace_id = $1 and archived_at is null order by name`,
      p: [w],
    },
    projects: {
      fin: false,
      columns: ["name", "customer", "status", "start", "due", "budget_ngn"],
      sql: `select p.name, c.name customer, p.status, p.start_date start, p.due_date due, round(p.budget_minor / 100.0, 2) budget_ngn from projects p join customers c on c.id = p.customer_id where p.workspace_id = $1 order by p.due_date`,
      p: [w],
    },
    tasks: {
      fin: false,
      columns: ["title", "project", "assignee", "priority", "status", "due"],
      sql: `select t.title, p.name project, wp.name assignee, t.priority, t.status, t.due_date due from tasks t join projects p on p.id = t.project_id left join workspace_people wp on wp.user_id = t.assignee_id and wp.workspace_id = t.workspace_id where t.workspace_id = $1 and (t.due_date is null or t.due_date between $2 and $3 or t.status <> 'done') order by t.due_date`,
      p: [w, from, to],
    },
    invoices: {
      fin: true,
      columns: [
        "number",
        "customer",
        "issued",
        "due",
        "subtotal",
        "tax",
        "total",
        "paid",
        "balance",
        "status",
      ],
      sql: `select number, customer_name customer, issue_date issued, due_date due, round(subtotal_minor / 100.0, 2) subtotal, round(tax_minor / 100.0, 2) tax, round(total_minor / 100.0, 2) total, round(paid_minor / 100.0, 2) paid, round(balance_minor / 100.0, 2) balance, status from invoice_summary where workspace_id = $1 and issue_date between $2 and $3 order by issue_date`,
      p: [w, from, to],
    },
    payments: {
      fin: true,
      columns: ["date", "invoice", "customer", "method", "reference", "amount"],
      sql: `select p.paid_on date, i.number invoice, c.name customer, p.method, p.reference, round(p.amount_minor / 100.0, 2) amount from payments p join invoices i on i.id = p.invoice_id join customers c on c.id = i.customer_id where p.workspace_id = $1 and p.paid_on between $2 and $3 order by p.paid_on`,
      p: [w, from, to],
    },
    "revenue-by-customer": {
      fin: true,
      columns: ["customer", "collected"],
      sql: `select c.name customer, round(sum(p.amount_minor) / 100.0, 2) collected from payments p join invoices i on i.id = p.invoice_id join customers c on c.id = i.customer_id where p.workspace_id = $1 and p.paid_on between $2 and $3 group by c.name order by 2 desc`,
      p: [w, from, to],
    },
  };
  const d = defs[key];
  if (!d || (d.fin && !ctx.canFinance)) return null;
  return ctx.q(async (c) => ({
    columns: d.columns,
    rows: (await c.query(d.sql, d.p)).rows,
  }));
}
