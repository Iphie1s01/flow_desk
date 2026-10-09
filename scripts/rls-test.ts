import { Client } from "pg";
const c = new Client({ connectionString: process.env.DATABASE_URL_ADMIN });
let pass = 0,
  fail = 0;
const ok = (cond: boolean, label: string) => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
};
const one = async (q: string, p: any[] = []) => (await c.query(q, p)).rows[0];
const asUser = async (uid: string) => {
  await c.query("reset role");
  await c.query("set local role flowdesk_app");
  await c.query("select set_config('app.user_id', $1, true)", [uid]);
};
const asOwnerRole = async () => {
  await c.query("reset role");
};
const fails = async (q: string, p: any[] = [], match?: RegExp) => {
  await c.query("savepoint s");
  try {
    await c.query(q, p);
    await c.query("release savepoint s");
    return false;
  } catch (e: any) {
    await c.query("rollback to savepoint s");
    return match ? match.test(e.message) : true;
  }
};
const count = async (q: string, p: any[] = []) =>
  Number((await one(`select count(*) n from (${q}) s`, p)).n);
const affected = async (q: string, p: any[] = []) => {
  await c.query("savepoint s");
  try {
    const r = await c.query(q, p);
    await c.query("release savepoint s");
    return r.rowCount ?? 0;
  } catch {
    await c.query("rollback to savepoint s");
    return -1;
  }
};

(async () => {
  await c.connect();
  await c.query("begin");
  for (const [id, n] of [
    ["tA", "Alice"],
    ["tB", "Bob"],
    ["tM", "Mia"],
    ["tV", "Vic"],
    ["tAdm", "Ade"],
  ])
    await c.query(
      `insert into "user"(id,name,email,"emailVerified","createdAt","updatedAt") values ($1,$2,lower($2)||'@t.test',true,now(),now())`,
      [id, n],
    );
  await asUser("tA");
  const wa = (await one(`select create_workspace('Alpha','agency','NGN') id`))
    .id;
  await asUser("tB");
  const wb = (await one(`select create_workspace('Bravo','agency','NGN') id`))
    .id;
  await asUser("tA");
  await c.query(
    `insert into workspace_invitations(workspace_id,email,role,token_hash,invited_by) values ($1,'mia@t.test','member','h1','tA'),($1,'vic@t.test','viewer','h2','tA'),($1,'ade@t.test','admin','h3','tA')`,
    [wa],
  );
  await asUser("tM");
  await c.query(`select accept_invitation('h1')`);
  await asUser("tV");
  await c.query(`select accept_invitation('h2')`);
  await asUser("tAdm");
  await c.query(`select accept_invitation('h3')`);
  await asUser("tA");
  const ca = (
    await one(
      `insert into customers(workspace_id,name,email,status,created_by) values ($1,'Acme','acme@x.test','active','tA') returning id`,
      [wa],
    )
  ).id;
  const p1 = (
    await one(
      `insert into projects(workspace_id,customer_id,name,due_date,status,created_by) values ($1,$2,'P1',current_date+30,'in_progress','tA') returning id`,
      [wa, ca],
    )
  ).id;
  const p2 = (
    await one(
      `insert into projects(workspace_id,customer_id,name,due_date,status,created_by) values ($1,$2,'P2',current_date+30,'in_progress','tA') returning id`,
      [wa, ca],
    )
  ).id;
  await c.query(
    `insert into project_members(workspace_id,project_id,user_id) values ($1,$2,'tM')`,
    [wa, p1],
  );
  const t1 = (
    await one(
      `insert into tasks(workspace_id,project_id,title,assignee_id,created_by) values ($1,$2,'Mia task','tM','tA') returning id`,
      [wa, p1],
    )
  ).id;
  const t2 = (
    await one(
      `insert into tasks(workspace_id,project_id,title,assignee_id,created_by) values ($1,$2,'Alice task','tA','tA') returning id`,
      [wa, p1],
    )
  ).id;
  await c.query(
    `insert into tasks(workspace_id,project_id,title,assignee_id,created_by) values ($1,$2,'Hidden from Mia','tA','tA')`,
    [wa, p2],
  );
  const i1 = (
    await one(
      `insert into invoices(workspace_id,customer_id,number,issue_date,due_date,tax_bp,created_by) values ($1,$2,'INV-1',current_date-5,current_date+25,750,'tA') returning id`,
      [wa, ca],
    )
  ).id;
  await c.query(
    `insert into invoice_items(workspace_id,invoice_id,description,quantity,unit_price_minor) values ($1,$2,'Design',2,500000)`,
    [wa, i1],
  );

  console.log("— tenant isolation");
  await asUser("tB");
  ok(
    (await count(`select 1 from customers`)) === 0,
    "Bob (workspace B) sees none of workspace A customers",
  );
  ok(
    (await count(`select 1 from workspaces`)) === 1,
    "Bob sees only his own workspace",
  );
  ok(
    (await count(`select 1 from invoice_summary`)) === 0,
    "Bob sees none of A invoices",
  );
  ok(
    (await count(`select 1 from workspace_people`)) === 1,
    "Bob sees only himself in the people directory",
  );
  ok(
    await fails(`insert into customers(workspace_id,name) values ($1,'Evil')`, [
      wa,
    ]),
    "Bob cannot insert a customer into workspace A",
  );
  ok(
    (await affected(`update customers set name='Hacked' where id=$1`, [ca])) ===
      0,
    "Bob cannot update A customer by guessing its id",
  );
  ok(
    (await affected(`delete from tasks where id=$1`, [t1])) === 0,
    "Bob cannot delete A tasks",
  );
  ok(
    await fails(
      `insert into projects(workspace_id,customer_id,name,due_date) values ($1,$2,'X',current_date+1)`,
      [wb, ca],
      /foreign key/i,
    ),
    "Composite FK blocks a B project pointing at A's customer",
  );
  ok(
    await fails(`select * from "user"`, [], /permission denied/),
    "App role cannot read auth tables",
  );
  ok(
    await fails(
      `select create_workspace('x','y','NGN') from generate_series(1,4)`,
      [],
      /limit/i,
    ),
    "Workspace creation is capped per user",
  );
  await asUser("tB");
  ok(
    await fails(
      `select accept_invitation('h1')`,
      [],
      /different email|invalid/i,
    ),
    "Bob cannot accept an invitation addressed to Mia",
  );
  ok(
    await fails(`select notify_user($1,'tA','invites','spoof',null,null)`, [
      wa,
    ]),
    "Bob cannot notify users in workspace A",
  );

  console.log("— roles");
  await asUser("tM");
  ok(
    (await count(`select 1 from projects`)) === 1,
    "Member sees only the project they are assigned to",
  );
  ok(
    (await count(`select 1 from tasks`)) === 2,
    "Member sees tasks of their own project only (not other projects)",
  );
  ok(
    (await count(`select 1 from invoice_summary`)) === 0 &&
      (await count(`select 1 from payments`)) === 0,
    "Member cannot see invoices or payments",
  );
  ok(
    await fails(`insert into customers(workspace_id,name) values ($1,'M')`, [
      wa,
    ]),
    "Member cannot create customers",
  );
  ok(
    (await affected(`update tasks set status='in_progress' where id=$1`, [
      t1,
    ])) === 1,
    "Member can update status of their own task",
  );
  ok(
    (await affected(`update tasks set status='done' where id=$1`, [t2])) === 0,
    "Member cannot update someone else's task",
  );
  ok(
    (await affected(`update tasks set assignee_id='tA' where id=$1`, [t1])) ===
      -1 ||
      (await affected(`update tasks set assignee_id='tA' where id=$1`, [
        t1,
      ])) === 0,
    "Member cannot reassign their task",
  );
  ok(
    await fails(
      `insert into workspace_invitations(workspace_id,email,role,token_hash,invited_by) values ($1,'z@t.test','member','hz','tM')`,
      [wa],
    ),
    "Member cannot invite",
  );
  await asUser("tV");
  ok(
    (await count(`select 1 from invoice_summary`)) === 1,
    "Viewer can read invoices",
  );
  ok(
    await fails(`insert into customers(workspace_id,name) values ($1,'V')`, [
      wa,
    ]),
    "Viewer cannot write customers",
  );
  ok(
    (await affected(`update tasks set status='done'`)) === 0,
    "Viewer cannot update tasks",
  );
  await asUser("tAdm");
  ok(
    await fails(
      `insert into workspace_invitations(workspace_id,email,role,token_hash,invited_by) values ($1,'q@t.test','admin','hq','tAdm')`,
      [wa],
    ),
    "Admin cannot invite another admin (owner only)",
  );
  ok(
    (await affected(
      `update workspace_members set role='viewer' where user_id='tM'`,
    )) === 0,
    "Admin cannot change roles (owner only)",
  );
  ok(
    (await affected(`delete from workspace_members where user_id='tA'`)) === 0,
    "Nobody can remove the owner",
  );

  console.log("— money rules");
  await asUser("tA");
  ok(
    (
      await one(
        `select total_minor::int t, subtotal_minor::int s, tax_minor::int x, status from invoice_summary where id=$1`,
        [i1],
      )
    ).t === 1075000,
    "Total = subtotal + 7.5% VAT, in integer kobo",
  );
  ok(
    (await one(`select status from invoice_summary where id=$1`, [i1]))
      .status === "draft",
    "New invoice is a draft",
  );
  ok(
    await fails(
      `insert into payments(workspace_id,invoice_id,amount_minor,paid_on,method,recorded_by) values ($1,$2,100,current_date,'cash','tA')`,
      [wa, i1],
      /Issue the invoice/,
    ),
    "Cannot pay a draft invoice",
  );
  await c.query(`update invoices set sent_at=now() where id=$1`, [i1]);
  ok(
    (await one(`select status from invoice_summary where id=$1`, [i1]))
      .status === "sent",
    'Issued invoice is "sent"',
  );
  ok(
    await fails(
      `update invoices set discount_minor=5 where id=$1`,
      [i1],
      /locked/,
    ),
    "Issued invoice is locked",
  );
  ok(
    await fails(
      `insert into invoice_items(workspace_id,invoice_id,description,quantity,unit_price_minor) values ($1,$2,'x',1,1)`,
      [wa, i1],
      /locked/,
    ),
    "Line items are locked after issue",
  );
  ok(
    await fails(
      `insert into payments(workspace_id,invoice_id,amount_minor,paid_on,method,recorded_by) values ($1,$2,1100000,current_date,'cash','tA')`,
      [wa, i1],
      /exceeds/,
    ),
    "Overpayment is rejected",
  );
  await c.query(
    `insert into payments(workspace_id,invoice_id,amount_minor,paid_on,method,recorded_by) values ($1,$2,500000,current_date,'bank_transfer','tA')`,
    [wa, i1],
  );
  const s1 = await one(
    `select status, balance_minor::int b from invoice_summary where id=$1`,
    [i1],
  );
  ok(
    s1.status === "partially_paid" && s1.b === 575000,
    "Partial payment → partially_paid, balance reconciles",
  );
  ok(
    await fails(
      `update invoices set voided_at=now() where id=$1`,
      [i1],
      /payments/,
    ),
    "Invoice with payments cannot be voided",
  );
  ok(
    await fails(
      `insert into payments(workspace_id,invoice_id,amount_minor,paid_on,method,recorded_by) values ($1,$2,1,current_date-10,'cash','tA')`,
      [wa, i1],
      /before/,
    ),
    "Payment before issue date is rejected",
  );
  await c.query(
    `insert into payments(workspace_id,invoice_id,amount_minor,paid_on,method,recorded_by) values ($1,$2,575000,current_date,'card','tA')`,
    [wa, i1],
  );
  ok(
    (await one(`select status from invoice_summary where id=$1`, [i1]))
      .status === "paid",
    "Full payment → paid",
  );
  ok(
    (await affected(`update payments set amount_minor=1 where invoice_id=$1`, [
      i1,
    ])) === 0,
    "Payments are immutable (no UPDATE policy)",
  );
  await asUser("tAdm");
  ok(
    (await affected(`delete from payments where invoice_id=$1`, [i1])) === 0,
    "Admins cannot delete payments (owner only)",
  );
  await asUser("tA");
  const i3 = (
    await one(
      `insert into invoices(workspace_id,customer_id,number,issue_date,due_date,created_by) values ($1,$2,'INV-3',current_date-40,current_date-10,'tA') returning id`,
      [wa, ca],
    )
  ).id;
  await c.query(
    `insert into invoice_items(workspace_id,invoice_id,description,quantity,unit_price_minor) values ($1,$2,'Late',1,100000)`,
    [wa, i3],
  );
  await c.query(`update invoices set sent_at=now() where id=$1`, [i3]);
  ok(
    (await one(`select status from invoice_summary where id=$1`, [i3]))
      .status === "overdue",
    "Unpaid past due date → overdue (derived, never stored)",
  );
  await c.query(`update invoices set voided_at=now() where id=$1`, [i3]);
  ok(
    (await one(`select status from invoice_summary where id=$1`, [i3]))
      .status === "void",
    "Unpaid invoice can be voided",
  );
  ok(
    await fails(
      `update invoices set due_date=due_date+1 where id=$1`,
      [i3],
      /Void/,
    ),
    "Void invoices cannot be changed",
  );

  console.log("— audit & misc");
  await c.query(
    `insert into activity_logs(workspace_id,actor_id,action,entity_type,summary) values ($1,'tA','test','customer','x')`,
    [wa],
  );
  ok(
    await fails(
      `insert into activity_logs(workspace_id,actor_id,action,entity_type,summary) values ($1,'tB','test','customer','spoof')`,
      [wa],
    ),
    "Activity actor cannot be spoofed",
  );
  ok(
    (await affected(`update activity_logs set summary='edited'`)) === 0 &&
      (await affected(`delete from activity_logs`)) === 0,
    "Activity log is append-only",
  );
  ok(
    (await one(`select hit_rate_limit('k1',2,60) a`).then((r) => r.a)) === true,
    "Rate limiter allows within the limit",
  );
  await c.query(`select hit_rate_limit('k1',2,60)`);
  ok(
    (await one(`select hit_rate_limit('k1',2,60) a`)).a === false,
    "Rate limiter blocks over the limit",
  );

  await asOwnerRole();
  await c.query("rollback");
  await c.end();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(async (e) => {
  console.error(e);
  try {
    await c.query("rollback");
  } catch {}
  process.exit(1);
});
