import { Pool, PoolClient, types } from "pg";

types.setTypeParser(20, (v) => Number(v)); // bigint → number (money is integer kobo; safe up to ₦90 trillion)
types.setTypeParser(1082, (v) => v); // keep DATE columns as 'YYYY-MM-DD' strings (no timezone shifts)

const g = globalThis as unknown as { __pool?: Pool; __authPool?: Pool };
/** Runtime pool. Connects as flowdesk_app, so Row Level Security applies to every query. */
export const pool = (g.__pool ??= new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
}));
/** Used only by Better Auth (flowdesk_auth role: auth tables only). */
export const authPool = (g.__authPool ??= new Pool({
  connectionString: process.env.AUTH_DATABASE_URL,
  max: 3,
}));

/**
 * Runs `fn` in a transaction with the caller's identity bound to the connection.
 * RLS policies read it via app.uid(); set_config(..., true) is transaction-local, so it is safe with Neon's pooler.
 */
export async function tx<T>(
  userId: string,
  fn: (c: PoolClient) => Promise<T>,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('app.user_id', $1, true)", [userId]);
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
