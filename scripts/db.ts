import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL_ADMIN;
if (!url) {
  console.error(
    "Set DATABASE_URL_ADMIN (the owner connection string) in .env.local",
  );
  process.exit(1);
}
const dir = path.join(process.cwd(), "db");

async function migrate() {
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const done = new Set(
    (await c.query("select name from _migrations")).rows.map((r) => r.name),
  );
  for (const f of fs.readdirSync(path.join(dir, "migrations")).sort()) {
    if (done.has(f)) {
      console.log("skip ", f);
      continue;
    }
    await c.query("begin");
    try {
      await c.query(fs.readFileSync(path.join(dir, "migrations", f), "utf8"));
      await c.query("insert into _migrations(name) values ($1)", [f]);
      await c.query("commit");
      console.log("apply", f);
    } catch (e) {
      await c.query("rollback");
      throw e;
    }
  }
  for (const [role, env] of [
    ["flowdesk_app", "APP_DB_PASSWORD"],
    ["flowdesk_auth", "AUTH_DB_PASSWORD"],
  ] as const) {
    const pw = process.env[env];
    if (pw) {
      await c.query(`select set_config('x.pw', $1, false)`, [pw]);
      await c.query(
        `do $$ begin execute format('alter role ${role} password %L', current_setting('x.pw')); end $$`,
      );
      console.log("password set for", role);
    }
  }
  await c.end();
}

async function seed() {
  const [owner, demo = ""] = process.argv.slice(3);
  const ok = (s: string) =>
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s);
  if (!owner || !ok(owner) || (demo && !ok(demo))) {
    console.error(
      "Usage: npm run db:seed -- you@email.com [demo-viewer@email.com]",
    );
    process.exit(1);
  }
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query(
    fs
      .readFileSync(path.join(dir, "seed.sql"), "utf8")
      .replace("{{OWNER_EMAIL}}", owner)
      .replace("{{DEMO_EMAIL}}", demo),
  );
  await c.end();
  console.log("Seeded Northstar Creative Studio, owned by", owner);
}

const cmd = process.argv[2];
if (cmd === "migrate")
  migrate().catch((e) => {
    console.error(e);
    process.exit(1);
  });
else if (cmd === "seed")
  seed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
else if (cmd === "test")
  import("./rls-test").catch((e) => {
    console.error(e);
    process.exit(1);
  });
else console.log("commands: migrate | seed | test");
