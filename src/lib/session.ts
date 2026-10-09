import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { PoolClient } from "pg";
import { auth } from "./auth";
import { tx } from "./db";
import { UserError } from "./action";
import type { Role } from "./constants";

export const WS_COOKIE = "fd_ws";
export type Workspace = {
  id: string;
  name: string;
  business_type: string | null;
  currency: string;
  address: string | null;
  payment_instructions: string | null;
  invoice_prefix: string;
  default_tax_bp: number;
  role: Role;
};
export type Ctx = {
  user: { id: string; name: string; email: string; image?: string | null };
  ws: Workspace;
  workspaces: { id: string; name: string }[];
  role: Role;
  isOwner: boolean;
  isAdmin: boolean;
  canFinance: boolean;
  canWrite: boolean;
  q: <T>(fn: (c: PoolClient) => Promise<T>) => Promise<T>;
};

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s.user;
}

/** Resolves who is calling and which workspace they are acting in. Membership comes from the database (under RLS), never from the client. */
export const getCtx = cache(async (): Promise<Ctx> => {
  const user = await requireUser();
  const q = <T>(fn: (c: PoolClient) => Promise<T>) => tx(user.id, fn);
  const rows = (
    await q((c) =>
      c.query(
        `select w.id, w.name, w.business_type, w.currency, w.address, w.payment_instructions, w.invoice_prefix, w.default_tax_bp, m.role
     from workspaces w join workspace_members m on m.workspace_id = w.id and m.user_id = $1 order by w.created_at`,
        [user.id],
      ),
    )
  ).rows as Workspace[];
  if (!rows.length) redirect("/onboarding");
  const want = (await cookies()).get(WS_COOKIE)?.value;
  const ws = rows.find((r) => r.id === want) ?? rows[0];
  const role = ws.role;
  return {
    user,
    ws,
    workspaces: rows.map((r) => ({ id: r.id, name: r.name })),
    role,
    q,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    canFinance: role !== "member",
    canWrite: role !== "viewer",
  };
});

/** Friendly pre-checks. Postgres RLS is the real enforcement; these just give clearer messages. */
export function need(ctx: Ctx, level: "admin" | "owner" | "write") {
  if (level === "write" && !ctx.canWrite)
    throw new UserError("This is a read-only account.");
  if (level === "admin" && !ctx.isAdmin)
    throw new UserError(
      ctx.canWrite
        ? "You need admin access to do this."
        : "This is a read-only account.",
    );
  if (level === "owner" && !ctx.isOwner)
    throw new UserError("Only the workspace owner can do this.");
}
export async function limit(ctx: Ctx, key: string, max: number, secs: number) {
  const r = await ctx.q((c) =>
    c.query("select hit_rate_limit($1,$2,$3) ok", [
      `${key}:${ctx.user.id}`,
      max,
      secs,
    ]),
  );
  if (!r.rows[0].ok)
    throw new UserError(
      "Too many attempts. Please wait a minute and try again.",
    );
}
export async function log(
  c: PoolClient,
  ctx: Ctx,
  action: string,
  entityType: string,
  entityId: string | null,
  summary: string,
) {
  await c.query(
    "insert into activity_logs (workspace_id, actor_id, action, entity_type, entity_id, summary) values ($1,$2,$3,$4,$5,$6)",
    [
      ctx.ws.id,
      ctx.user.id,
      action,
      entityType,
      entityId,
      summary.slice(0, 300),
    ],
  );
}
export const notify = (
  c: PoolClient,
  ctx: Ctx,
  userId: string,
  type: "task_assigned" | "invoices" | "invites" | "deadlines",
  title: string,
  href: string,
) =>
  userId === ctx.user.id
    ? Promise.resolve()
    : c.query("select notify_user($1,$2,$3,$4,$5,$6)", [
        ctx.ws.id,
        userId,
        type,
        title,
        null,
        href,
      ]);
