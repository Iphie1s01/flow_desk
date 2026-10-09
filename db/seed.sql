-- Demo workspace: "Northstar Creative Studio" (fictional). Run through `npm run db:seed -- you@email.com [demo@email.com]`.
create function pg_temp.ri(a int, b int) returns int language sql as $$ select a + floor(random() * (b - a + 1))::int $$;
do $$
declare
  owner_email text := '{{OWNER_EMAIL}}'; demo_email text := nullif('{{DEMO_EMAIL}}', '');
  oid text; did text; ws uuid; i int; j int; n int; t numeric; a bigint;
  uids text[]; cids uuid[] := '{}'; pids uuid[] := '{}'; inv uuid; iss date; pr uuid; cu uuid; st text;
  names text[] := array['Ada Obi','Tunde Bello','Chioma Eze','Ibrahim Musa','Ngozi Daniel','Femi Adeyemi','Sade Johnson','Emeka Nwosu','Halima Garba','Bola Ajayi','Kelechi Okeke','Zainab Lawal','Seun Coker','Ifeoma Chukwu','Musa Abdullahi','Tolu Fashola','Rita Etim','Dapo Williams'];
  cos text[] := array['Zest Foods','Kora Labs','Bluewave','Sahel Logistics','Pearl Studio','Orbit Pay','Greenfield','Atlas Media','Lagoon Hotels','Mainland Tech','Harmattan Films','Eko Fresh','Ankara Atelier','Delta Freight','Savanna Textiles','Palmline Cafe','Calabash Foods','Island Realty'];
  pn text[] := array['Website Redesign','Brand Identity','Mobile App','Product Film','Packaging Design','Social Campaign','Annual Report','Logo Animation','E-commerce Build','Photography Series','Launch Event Kit','Motion Graphics Pack'];
  ps text[] := array['planning','planning','in_progress','in_progress','in_progress','in_progress','in_progress','in_progress','on_hold','completed','completed','completed'];
  tt text[] := array['Kickoff call','Gather assets','Wireframes','First draft','Client review','Revisions','Final files','Handover'];
  ds text[] := array['Design work','Development','Consulting','Animation','Copywriting','Photography'];
  pm text[] := array['bank_transfer','card','cash','pos'];
begin
  select id into oid from "user" where email = lower(owner_email);
  if oid is null then raise exception 'No user with email %. Sign up and verify your email first.', owner_email; end if;
  perform setseed(0.42);
  alter table tasks disable trigger tasks_touch;
  insert into workspaces (name, business_type, currency, created_by, address, payment_instructions, default_tax_bp, next_invoice_no)
    values ('Northstar Creative Studio','agency','NGN',oid,'14 Admiralty Way, Lekki, Lagos','Bank transfer to Northstar Creative Studio, 0123456789 (demo account)',750,1025) returning id into ws;
  insert into workspace_members (workspace_id, user_id, role) values (ws, oid, 'owner');
  uids := array[oid];
  for i in 1..4 loop
    did := 'seed-' || substr(ws::text,1,8) || '-' || i;
    insert into "user" (id,name,email,"emailVerified","createdAt","updatedAt")
      values (did, (array['Kunle Bakare','Amara Nwosu','Yusuf Danjuma','Efe Okoro'])[i], 'seed' || i || '.' || substr(ws::text,1,8) || '@northstar.studio', true, now(), now());
    insert into workspace_members (workspace_id, user_id, role) values (ws, did, case when i = 1 then 'admin' else 'member' end);
    uids := uids || did;
  end loop;
  if demo_email is not null then
    select id into did from "user" where email = lower(demo_email);
    if did is not null then insert into workspace_members (workspace_id, user_id, role) values (ws, did, 'viewer') on conflict do nothing; end if;
  end if;
  for i in 1..18 loop
    insert into customers (workspace_id,name,company,email,phone,type,status,created_by,created_at)
    values (ws, names[i], cos[i], lower(split_part(names[i],' ',1)) || '@' || lower(split_part(cos[i],' ',1)) || '.ng', '+234 80' || pg_temp.ri(1,9) || ' ' || pg_temp.ri(100,999) || ' ' || pg_temp.ri(1000,9999),
      'business', case when i % 6 = 0 then 'lead' when i % 7 = 0 then 'inactive' else 'active' end, oid, now() - make_interval(days => pg_temp.ri(15,400)))
    returning id into inv; cids := cids || inv;
  end loop;
  for i in 1..12 loop
    insert into projects (workspace_id,customer_id,name,description,status,start_date,due_date,budget_minor,created_by)
    values (ws, cids[1 + (i * 3) % 18], pn[i], 'Scope and deliverables agreed with the client.', ps[i], current_date - pg_temp.ri(70,150),
      case when ps[i] = 'completed' then current_date - pg_temp.ri(5,60) else current_date + pg_temp.ri(-8,60) end, pg_temp.ri(3,40) * 10000000::bigint, oid)
    returning id into pr; pids := pids || pr;
    insert into project_members (workspace_id, project_id, user_id) select ws, pr, u from unnest(uids[1:1] || uids[pg_temp.ri(2,5):pg_temp.ri(2,5)]) u group by u;
    for j in 1..(case when i <= 5 then 6 else 5 end) loop
      st := case when ps[i] = 'completed' or (ps[i] = 'in_progress' and j <= pg_temp.ri(1,3)) then 'done'
                 when ps[i] = 'planning' then 'todo' else (array['todo','in_progress','in_review'])[pg_temp.ri(1,3)] end;
      insert into tasks (workspace_id,project_id,title,assignee_id,priority,status,due_date,created_by,created_at,updated_at,completed_at)
      select ws, pr, tt[1 + (i + j) % 8] || ' · ' || split_part(pn[i],' ',1), user_id, (array['low','medium','high','urgent'])[pg_temp.ri(1,4)], st,
             current_date + case when st = 'done' then -pg_temp.ri(3,40) else pg_temp.ri(-9,28) end, oid, now() - interval '60 days',
             now() - make_interval(days => case when i in (4,7) then pg_temp.ri(28,45) else pg_temp.ri(0,12) end),
             case when st = 'done' then now() - interval '10 days' end
      from project_members where project_id = pr order by random() limit 1;
    end loop;
  end loop;
  for i in 1..24 loop
    select p.id, p.customer_id into pr, cu from projects p where p.id = pids[1 + (i - 1) % 12];
    iss := case when i > 22 then current_date else current_date - pg_temp.ri(2,80) end;
    insert into invoices (workspace_id,customer_id,project_id,number,issue_date,due_date,tax_bp,terms,created_by)
      values (ws, cu, pr, 'INV-' || (1000 + i), iss, iss + 30, case when i % 2 = 0 then 750 else 0 end, 'Payment due within 30 days.', oid) returning id into inv;
    insert into invoice_items (workspace_id, invoice_id, position, description, quantity, unit_price_minor)
      select ws, inv, g, ds[pg_temp.ri(1,6)], pg_temp.ri(1,3), pg_temp.ri(1,12) * 2500000::bigint from generate_series(1, pg_temp.ri(1,3)) g;
    if i > 22 then continue; end if;
    update invoices set sent_at = iss + time '09:00', voided_at = case when i = 21 then now() end where id = inv;
    if i = 21 then continue; end if;
    t := random();
    select (x.s - i2.discount_minor) + round((x.s - i2.discount_minor) * i2.tax_bp / 10000.0)::bigint into a
      from invoices i2 cross join lateral (select coalesce(sum(quantity * unit_price_minor),0)::bigint s from invoice_items where invoice_id = i2.id) x where i2.id = inv;
    if t < .55 then
      if random() < .6 then
        insert into payments (workspace_id,invoice_id,amount_minor,paid_on,method,reference,recorded_by) values (ws, inv, round(a * .6), least(iss + pg_temp.ri(3,15), current_date), pm[pg_temp.ri(1,4)], 'REF' || pg_temp.ri(10000,99999), oid);
        insert into payments (workspace_id,invoice_id,amount_minor,paid_on,method,reference,recorded_by) values (ws, inv, a - round(a * .6), least(iss + pg_temp.ri(16,40), current_date), pm[pg_temp.ri(1,4)], 'REF' || pg_temp.ri(10000,99999), oid);
      else
        insert into payments (workspace_id,invoice_id,amount_minor,paid_on,method,reference,recorded_by) values (ws, inv, a, least(iss + pg_temp.ri(3,35), current_date), pm[pg_temp.ri(1,4)], 'REF' || pg_temp.ri(10000,99999), oid);
      end if;
    elsif t < .75 then
      insert into payments (workspace_id,invoice_id,amount_minor,paid_on,method,reference,recorded_by) values (ws, inv, round(a * .5), least(iss + pg_temp.ri(3,20), current_date), pm[pg_temp.ri(1,4)], 'REF' || pg_temp.ri(10000,99999), oid);
    end if;
  end loop;
  insert into activity_logs (workspace_id, actor_id, action, entity_type, entity_id, summary, created_at)
    select ws, oid, 'payment.recorded', 'payment', id, 'recorded a payment of ' || (amount_minor / 100) || ' ' || 'NGN', paid_on from payments where workspace_id = ws order by paid_on desc limit 8;
  insert into activity_logs (workspace_id, actor_id, action, entity_type, entity_id, summary) select ws, oid, 'project.created', 'project', id, 'created project "' || name || '"' from projects where workspace_id = ws limit 4;
  alter table tasks enable trigger tasks_touch;
end $$;
