-- FlowDesk core schema, business rules and row-level security.
-- Run as the database OWNER (DATABASE_URL_ADMIN). The app connects as flowdesk_app (RLS enforced).

-- ───────────── roles ─────────────
do $$ begin
  if not exists (select from pg_roles where rolname = 'flowdesk_app')  then create role flowdesk_app  login noinherit nobypassrls; end if;
  if not exists (select from pg_roles where rolname = 'flowdesk_auth') then create role flowdesk_auth login noinherit nobypassrls; end if;
end $$;

-- lets the owner role SET ROLE flowdesk_app in tests (PG16 no longer grants this implicitly)
do $$ begin execute format('grant flowdesk_app to %I', current_user); execute format('grant flowdesk_auth to %I', current_user); exception when others then null; end $$;

create schema if not exists app;

-- ───────────── tables ─────────────
create table profiles (
  user_id    text primary key references "user"(id) on delete cascade,
  full_name  text,
  avatar_url text,
  onboarded  boolean not null default false,
  goals      text[] not null default '{}',
  notify     jsonb  not null default '{"task_assigned":true,"deadlines":true,"invoices":true,"invites":true}',
  created_at timestamptz not null default now()
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  business_type text,
  currency char(3) not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  address text,
  payment_instructions text,
  invoice_prefix text not null default 'INV' check (invoice_prefix ~ '^[A-Z0-9]{2,6}$'),
  next_invoice_no int not null default 1001,
  default_tax_bp int not null default 0 check (default_tax_bp between 0 and 10000),
  created_by text references "user"(id),
  created_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','viewer')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create unique index one_owner_per_workspace on workspace_members (workspace_id) where role = 'owner';
create index on workspace_members (user_id);

create table workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null check (email = lower(email)),
  role text not null check (role in ('admin','member','viewer')),
  token_hash text not null unique,
  invited_by text not null references "user"(id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index one_pending_invite on workspace_invitations (workspace_id, email) where accepted_at is null and revoked_at is null;

create table customers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  company text, email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'), phone text,
  type text not null default 'business' check (type in ('individual','business')),
  status text not null default 'lead' check (status in ('lead','active','inactive')),
  notes text,
  archived_at timestamptz,
  created_by text references "user"(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);
create unique index customer_email_unique on customers (workspace_id, lower(email)) where email is not null and archived_at is null;
create index on customers (workspace_id, status);

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  customer_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  status text not null default 'planning' check (status in ('planning','in_progress','on_hold','completed')),
  start_date date not null default current_date,
  due_date date not null,
  budget_minor bigint not null default 0 check (budget_minor between 0 and 1000000000000),
  completed_at timestamptz,
  created_by text references "user"(id),
  created_at timestamptz not null default now(),
  check (due_date >= start_date),
  unique (workspace_id, id),
  foreign key (workspace_id, customer_id) references customers (workspace_id, id)
);
create index on projects (workspace_id, status);

create table project_members (
  workspace_id uuid not null,
  project_id uuid not null,
  user_id text not null,
  primary key (project_id, user_id),
  foreign key (workspace_id, project_id) references projects (workspace_id, id) on delete cascade,
  foreign key (workspace_id, user_id) references workspace_members (workspace_id, user_id) on delete cascade
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  assignee_id text,
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'todo' check (status in ('todo','in_progress','in_review','done')),
  due_date date,
  completed_at timestamptz,
  created_by text references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, project_id) references projects (workspace_id, id) on delete cascade,
  foreign key (workspace_id, assignee_id) references workspace_members (workspace_id, user_id) on delete set null (assignee_id)
);
create index on tasks (workspace_id, status);
create index on tasks (assignee_id);
create index on tasks (project_id);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  customer_id uuid not null,
  project_id uuid,
  number text not null,
  issue_date date not null default current_date,
  due_date date not null,
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  tax_bp int not null default 0 check (tax_bp between 0 and 10000),
  notes text, terms text,
  sent_at timestamptz,
  voided_at timestamptz,
  created_by text references "user"(id),
  created_at timestamptz not null default now(),
  check (due_date >= issue_date),
  unique (workspace_id, number),
  unique (workspace_id, id),
  foreign key (workspace_id, customer_id) references customers (workspace_id, id),
  foreign key (workspace_id, project_id) references projects (workspace_id, id) on delete set null (project_id)
);
create index on invoices (workspace_id, issue_date desc);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  invoice_id uuid not null,
  position int not null default 0,
  description text not null check (char_length(description) between 1 and 200),
  quantity int not null check (quantity between 1 and 100000),
  unit_price_minor bigint not null check (unit_price_minor between 0 and 1000000000000),
  foreign key (workspace_id, invoice_id) references invoices (workspace_id, id) on delete cascade
);
create index on invoice_items (invoice_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  invoice_id uuid not null,
  amount_minor bigint not null check (amount_minor > 0),
  paid_on date not null,
  method text not null check (method in ('bank_transfer','card','cash','pos','other')),
  reference text,
  recorded_by text references "user"(id),
  provider text, provider_reference text,
  created_at timestamptz not null default now(),
  unique (provider, provider_reference),
  foreign key (workspace_id, invoice_id) references invoices (workspace_id, id)
);
create index on payments (workspace_id, paid_on);
create index on payments (invoice_id);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  project_id uuid not null,
  storage_key text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes int not null check (size_bytes between 1 and 10485760),
  status text not null default 'pending' check (status in ('pending','ready')),
  uploaded_by text not null references "user"(id),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, project_id) references projects (workspace_id, id) on delete cascade
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id text not null,
  type text not null,
  title text not null, body text, href text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, user_id) references workspace_members (workspace_id, user_id) on delete cascade
);
create unique index notification_dedupe on notifications (user_id, dedupe_key) where dedupe_key is not null;
create index on notifications (user_id, created_at desc);

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id text references "user"(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  created_at timestamptz not null default now()
);
create index on activity_logs (workspace_id, created_at desc);

create table rate_limits (key text primary key, window_start timestamptz not null, hits int not null);

-- ───────────── helper functions (security definer so policies never recurse) ─────────────
create function app.uid() returns text language sql stable as $$ select nullif(current_setting('app.user_id', true), '') $$;

create function app.role_in(ws uuid) returns text language sql stable security definer set search_path = public as
$$ select role from workspace_members where workspace_id = ws and user_id = app.uid() $$;
create function app.is_member(ws uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from workspace_members where workspace_id = ws and user_id = app.uid()) $$;
create function app.is_admin(ws uuid) returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(app.role_in(ws) in ('owner','admin'), false) $$;
create function app.can_read_finance(ws uuid) returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(app.role_in(ws) in ('owner','admin','viewer'), false) $$;
create function app.can_see_project(pid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from projects p join workspace_members m on m.workspace_id = p.workspace_id and m.user_id = app.uid()
     where p.id = pid and (m.role <> 'member' or exists (select 1 from project_members pm where pm.project_id = p.id and pm.user_id = app.uid()))) $$;

-- Money: integer minor units (kobo). Total = (subtotal - discount) + round((subtotal - discount) * tax_bp / 10000).
create function invoice_total_minor(inv uuid) returns bigint language sql stable security definer set search_path = public as $$
  select (x.s - i.discount_minor) + round((x.s - i.discount_minor) * i.tax_bp / 10000.0)::bigint
  from invoices i cross join lateral (select coalesce(sum(quantity * unit_price_minor), 0)::bigint as s from invoice_items where invoice_id = i.id) x
  where i.id = inv and app.can_read_finance(i.workspace_id) $$;

-- ───────────── derived invoice state: status is NEVER stored ─────────────
create view invoice_summary with (security_invoker = true) as
select q.*, q.total_minor - q.paid_minor as balance_minor,
  case when q.voided_at is not null then 'void'
       when q.sent_at is null then 'draft'
       when q.total_minor - q.paid_minor <= 0 then 'paid'
       when q.due_date < current_date then 'overdue'
       when q.paid_minor > 0 then 'partially_paid'
       else 'sent' end as status
from (
  select i.*, c.name as customer_name, c.company as customer_company, s.subtotal_minor, t.tax_minor,
         s.subtotal_minor - i.discount_minor + t.tax_minor as total_minor,
         coalesce((select sum(p.amount_minor) from payments p where p.invoice_id = i.id), 0)::bigint as paid_minor
  from invoices i
  join customers c on c.id = i.customer_id
  cross join lateral (select coalesce(sum(x.quantity * x.unit_price_minor), 0)::bigint as subtotal_minor from invoice_items x where x.invoice_id = i.id) s
  cross join lateral (select round((s.subtotal_minor - i.discount_minor) * i.tax_bp / 10000.0)::bigint as tax_minor) t
) q;

-- Who can see names/emails of workspace people (the app role has no access to auth tables).
create view workspace_people as
select m.workspace_id, m.user_id, m.role, m.joined_at, u.name, u.email, u.image
from workspace_members m join "user" u on u.id = m.user_id
where app.is_member(m.workspace_id);

-- ───────────── triggers: rules that must hold no matter which client writes ─────────────
create function trg_profile() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into profiles (user_id, full_name) values (new.id, new.name) on conflict do nothing; return new; end $$;
create trigger user_profile after insert on "user" for each row execute function trg_profile();

create function trg_touch() returns trigger language plpgsql as $$
begin
  if tg_table_name = 'tasks' then
    new.updated_at := now();
    new.completed_at := case when new.status = 'done' then coalesce(case when tg_op = 'UPDATE' then old.completed_at end, now()) end;
  elsif tg_table_name = 'projects' then
    new.completed_at := case when new.status = 'completed' then coalesce(case when tg_op = 'UPDATE' then old.completed_at end, now()) end;
  end if;
  return new;
end $$;
create trigger tasks_touch before insert or update on tasks for each row execute function trg_touch();
create trigger projects_touch before insert or update on projects for each row execute function trg_touch();

create function trg_invoice_guard() returns trigger language plpgsql as $$
begin
  if old.voided_at is not null then raise exception 'Void invoices cannot be changed'; end if;
  if old.sent_at is not null and (new.customer_id, new.number, new.issue_date, new.discount_minor, new.tax_bp, new.sent_at)
     is distinct from (old.customer_id, old.number, old.issue_date, old.discount_minor, old.tax_bp, old.sent_at) then
    raise exception 'Issued invoices are locked. Void the invoice and create a new one instead';
  end if;
  if new.voided_at is not null and exists (select 1 from payments where invoice_id = old.id) then
    raise exception 'Invoices with recorded payments cannot be voided';
  end if;
  return new;
end $$;
create trigger invoices_guard before update on invoices for each row execute function trg_invoice_guard();

create function trg_items_guard() returns trigger language plpgsql as $$
declare i invoices%rowtype;
begin
  select * into i from invoices where id = coalesce(new.invoice_id, old.invoice_id);
  if found and (i.sent_at is not null or i.voided_at is not null) then raise exception 'Line items are locked once an invoice is issued'; end if;
  return coalesce(new, old);
end $$;
create trigger items_guard before insert or update or delete on invoice_items for each row execute function trg_items_guard();

create function trg_payment_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare i invoices%rowtype; tot bigint; paid bigint;
begin
  select * into i from invoices where id = new.invoice_id for update;   -- serialises concurrent payments
  if i.voided_at is not null then raise exception 'Cannot record a payment on a void invoice'; end if;
  if i.sent_at is null then raise exception 'Issue the invoice before recording payments'; end if;
  if new.paid_on < i.issue_date then raise exception 'Payment date is before the invoice issue date'; end if;
  if new.paid_on > current_date + 1 then raise exception 'Payment date cannot be in the future'; end if;
  select (x.s - i.discount_minor) + round((x.s - i.discount_minor) * i.tax_bp / 10000.0)::bigint into tot
    from (select coalesce(sum(quantity * unit_price_minor), 0)::bigint as s from invoice_items where invoice_id = i.id) x;
  select coalesce(sum(amount_minor), 0) into paid from payments where invoice_id = i.id;
  if paid + new.amount_minor > tot then raise exception 'Payment exceeds the outstanding balance'; end if;
  return new;
end $$;
create trigger payments_guard before insert on payments for each row execute function trg_payment_guard();

-- ───────────── RPC functions (the only way to cross tenant boundaries, each re-checks identity) ─────────────
create function create_workspace(p_name text, p_type text, p_currency text) returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if app.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if (select count(*) from workspace_members where user_id = app.uid() and role = 'owner') >= 3 then raise exception 'Workspace limit reached'; end if;
  insert into workspaces (name, business_type, currency, created_by) values (p_name, p_type, upper(p_currency), app.uid()) returning id into ws;
  insert into workspace_members (workspace_id, user_id, role) values (ws, app.uid(), 'owner');
  return ws;
end $$;

create function invitation_preview(p_hash text) returns table (workspace_name text, role text, email text) language sql stable security definer set search_path = public as $$
  select w.name, i.role, i.email from workspace_invitations i join workspaces w on w.id = i.workspace_id
  where app.uid() is not null and i.token_hash = p_hash and i.accepted_at is null and i.revoked_at is null and i.expires_at > now() $$;

create function accept_invitation(p_hash text) returns uuid language plpgsql security definer set search_path = public as $$
declare inv workspace_invitations%rowtype; u record;
begin
  if app.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into inv from workspace_invitations where token_hash = p_hash and accepted_at is null and revoked_at is null for update;
  if not found or inv.expires_at < now() then raise exception 'This invitation is invalid or has expired'; end if;
  select email, "emailVerified" as verified into u from "user" where id = app.uid();
  if lower(u.email) <> inv.email then raise exception 'This invitation was sent to a different email address'; end if;
  if not u.verified then raise exception 'Verify your email address before joining'; end if;
  insert into workspace_members (workspace_id, user_id, role) values (inv.workspace_id, app.uid(), inv.role) on conflict do nothing;
  update workspace_invitations set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end $$;

create function next_invoice_number(ws uuid) returns text language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not app.is_admin(ws) then raise exception 'Not allowed' using errcode = '42501'; end if;
  update workspaces set next_invoice_no = next_invoice_no + 1 where id = ws returning invoice_prefix as p, next_invoice_no - 1 as n into r;
  return r.p || '-' || r.n;
end $$;

create function notify_user(ws uuid, uid text, p_type text, p_title text, p_body text, p_href text) returns void language plpgsql security definer set search_path = public as $$
declare pref jsonb;
begin
  if not app.is_member(ws) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from workspace_members where workspace_id = ws and user_id = uid) then return; end if;
  select notify into pref from profiles where user_id = uid;
  if coalesce((pref ->> p_type)::boolean, true) is false then return; end if;
  insert into notifications (workspace_id, user_id, type, title, body, href) values (ws, uid, p_type, left(p_title, 200), left(p_body, 500), p_href);
end $$;

create function hit_rate_limit(p_key text, p_max int, p_secs int) returns boolean language plpgsql security definer set search_path = public as $$
declare h int;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when rate_limits.window_start < now() - make_interval(secs => p_secs) then now() else rate_limits.window_start end,
    hits = case when rate_limits.window_start < now() - make_interval(secs => p_secs) then 1 else rate_limits.hits + 1 end
  returning hits into h;
  return h <= p_max;
end $$;

-- ───────────── row level security ─────────────
alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invitations enable row level security;
alter table customers enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table attachments enable row level security;
alter table notifications enable row level security;
alter table activity_logs enable row level security;

create policy profiles_sel on profiles for select using (user_id = app.uid());
create policy profiles_upd on profiles for update using (user_id = app.uid()) with check (user_id = app.uid());

create policy ws_sel on workspaces for select using (app.is_member(id));
create policy ws_upd on workspaces for update using (app.is_admin(id)) with check (app.is_admin(id));

create policy wm_sel on workspace_members for select using (app.is_member(workspace_id));
create policy wm_upd on workspace_members for update using (app.role_in(workspace_id) = 'owner' and role <> 'owner') with check (role in ('admin','member','viewer'));
create policy wm_del on workspace_members for delete using (role <> 'owner' and (
  app.role_in(workspace_id) = 'owner' or (app.role_in(workspace_id) = 'admin' and role in ('member','viewer')) or user_id = app.uid()));

create policy inv_sel on workspace_invitations for select using (app.is_admin(workspace_id));
create policy inv_ins on workspace_invitations for insert with check (app.is_admin(workspace_id) and invited_by = app.uid() and (role in ('member','viewer') or app.role_in(workspace_id) = 'owner'));
create policy inv_upd on workspace_invitations for update using (app.is_admin(workspace_id)) with check (app.is_admin(workspace_id));

create policy cust_sel on customers for select using (app.is_member(workspace_id));
create policy cust_ins on customers for insert with check (app.is_admin(workspace_id));
create policy cust_upd on customers for update using (app.is_admin(workspace_id)) with check (app.is_admin(workspace_id));
create policy cust_del on customers for delete using (app.is_admin(workspace_id));

-- inline (not via can_see_project) so INSERT ... RETURNING can see the row it just created
create policy proj_sel on projects for select using (app.is_member(workspace_id) and (app.role_in(workspace_id) <> 'member'
  or exists (select 1 from project_members pm where pm.project_id = projects.id and pm.user_id = app.uid())));
create policy proj_ins on projects for insert with check (app.is_admin(workspace_id));
create policy proj_upd on projects for update using (app.is_admin(workspace_id)) with check (app.is_admin(workspace_id));
create policy proj_del on projects for delete using (app.is_admin(workspace_id));

create policy pm_sel on project_members for select using (app.is_member(workspace_id));
create policy pm_ins on project_members for insert with check (app.is_admin(workspace_id));
create policy pm_del on project_members for delete using (app.is_admin(workspace_id));

create policy task_sel on tasks for select using (app.can_see_project(project_id) or assignee_id = app.uid());
create policy task_ins on tasks for insert with check (app.is_admin(workspace_id) or (app.role_in(workspace_id) = 'member' and app.can_see_project(project_id) and created_by = app.uid()));
create policy task_upd on tasks for update
  using (app.is_admin(workspace_id) or (app.role_in(workspace_id) = 'member' and assignee_id = app.uid()))
  with check (app.is_admin(workspace_id) or (app.role_in(workspace_id) = 'member' and assignee_id = app.uid() and app.can_see_project(project_id)));
create policy task_del on tasks for delete using (app.is_admin(workspace_id));

create policy invc_sel on invoices for select using (app.can_read_finance(workspace_id));
create policy invc_ins on invoices for insert with check (app.is_admin(workspace_id));
create policy invc_upd on invoices for update using (app.is_admin(workspace_id)) with check (app.is_admin(workspace_id));
create policy invc_del on invoices for delete using (app.is_admin(workspace_id) and sent_at is null and voided_at is null);

create policy item_sel on invoice_items for select using (app.can_read_finance(workspace_id));
create policy item_ins on invoice_items for insert with check (app.is_admin(workspace_id));
create policy item_upd on invoice_items for update using (app.is_admin(workspace_id)) with check (app.is_admin(workspace_id));
create policy item_del on invoice_items for delete using (app.is_admin(workspace_id));

create policy pay_sel on payments for select using (app.can_read_finance(workspace_id));
create policy pay_ins on payments for insert with check (app.is_admin(workspace_id) and recorded_by = app.uid());
create policy pay_del on payments for delete using (app.role_in(workspace_id) = 'owner');   -- no UPDATE policy: payments are immutable

create policy att_sel on attachments for select using (app.can_see_project(project_id));
create policy att_ins on attachments for insert with check (uploaded_by = app.uid() and (app.is_admin(workspace_id) or (app.role_in(workspace_id) = 'member' and app.can_see_project(project_id))));
create policy att_upd on attachments for update using (uploaded_by = app.uid()) with check (uploaded_by = app.uid());
create policy att_del on attachments for delete using (app.is_admin(workspace_id) or uploaded_by = app.uid());

create policy notif_sel on notifications for select using (user_id = app.uid());
create policy notif_ins on notifications for insert with check (user_id = app.uid() and app.is_member(workspace_id));
create policy notif_upd on notifications for update using (user_id = app.uid()) with check (user_id = app.uid());
create policy notif_del on notifications for delete using (user_id = app.uid());

create policy act_sel on activity_logs for select using (app.is_member(workspace_id) and (app.can_read_finance(workspace_id) or entity_type not in ('invoice','payment')));
create policy act_ins on activity_logs for insert with check (app.is_member(workspace_id) and actor_id = app.uid());   -- append-only: no update/delete

-- ───────────── grants ─────────────
grant usage on schema public, app to flowdesk_app;
grant select, insert, update, delete on all tables in schema public to flowdesk_app;
revoke all on "user", "session", "account", "verification", "rateLimit", rate_limits from flowdesk_app;
revoke all on workspace_people from flowdesk_auth;
grant select on workspace_people to flowdesk_app;
grant usage on schema public to flowdesk_auth;
grant select, insert, update, delete on "user", "session", "account", "verification", "rateLimit" to flowdesk_auth;
