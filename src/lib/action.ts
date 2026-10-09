import { ZodError } from "zod";
import { isRedirectError } from "next/dist/client/components/redirect-error";

/** Errors safe to show to the user. */
export class UserError extends Error {
  constructor(
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export type Res<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string> };

/** Wraps a server action body: validation + Postgres errors become friendly results, internals are never leaked. */
export async function run<T>(fn: () => Promise<T>): Promise<Res<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e: any) {
    if (isRedirectError(e)) throw e;
    if (e instanceof UserError)
      return { ok: false, error: e.message, fields: e.fields };
    if (e instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const i of e.issues)
        fields[String(i.path[0] ?? "form")] ??= i.message;
      return { ok: false, error: "Please fix the highlighted fields.", fields };
    }
    if (e?.constraint === "customer_email_unique")
      return {
        ok: false,
        error: "A customer with this exact email already exists.",
        fields: { email: "A customer with this exact email already exists." },
      };
    if (e?.constraint === "one_pending_invite")
      return {
        ok: false,
        error: "This person already has a pending invitation.",
        fields: { email: "Already invited. Revoke or resend from the list." },
      };
    switch (e?.code) {
      case "42501":
        return { ok: false, error: "You don't have permission to do that." };
      case "23505":
        return { ok: false, error: "That record already exists." };
      case "23503":
        return {
          ok: false,
          error:
            "This record is linked to other data, so it cannot be changed this way.",
        };
      case "23514":
        return {
          ok: false,
          error: "Some values are not allowed. Check the dates and amounts.",
        };
      case "P0001":
        return { ok: false, error: e.message }; // our own RAISE EXCEPTION messages are written for users
    }
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
