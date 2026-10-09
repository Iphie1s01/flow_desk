import { z } from "zod";
import { parseMoney } from "./money";

const text = (max = 200) =>
  z.string().trim().max(max, `Keep it under ${max} characters`);
const optText = (max = 200) =>
  text(max)
    .optional()
    .transform((v) => v || null);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date");
const optDate = z
  .preprocess((v) => (v === "" ? undefined : v), date.optional())
  .transform((v) => v ?? null);
const uuid = (msg = "Choose an option") => z.string().uuid(msg);
const optUuid = z
  .preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional())
  .transform((v) => v ?? null);
const money = (field = "Amount") =>
  z.string().transform((s, ctx) => {
    const v = parseMoney(s);
    if (Number.isNaN(v)) {
      ctx.addIssue({
        code: "custom",
        message: `${field} must be a valid amount, e.g. 250000 or 1500.50`,
      });
      return z.NEVER;
    }
    return v;
  });

export const customerSchema = z.object({
  id: uuid().optional(),
  name: text(120).min(1, "Name is required"),
  company: optText(),
  phone: optText(40),
  notes: optText(2000),
  email: z
    .union([z.literal(""), text(200).email("Enter a valid email address")])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  type: z.enum(["individual", "business"]).default("business"),
  status: z.enum(["lead", "active", "inactive"]).default("lead"),
});

export const projectSchema = z
  .object({
    id: uuid().optional(),
    name: text(120).min(1, "Project name is required"),
    customerId: uuid("Choose a customer"),
    description: optText(2000),
    startDate: date,
    dueDate: date,
    budget: money("Budget"),
    status: z.enum(["planning", "in_progress", "on_hold", "completed"]),
    members: z.array(z.string()).min(1, "Assign at least one team member"),
  })
  .refine((v) => v.dueDate >= v.startDate, {
    path: ["dueDate"],
    message: "Due date must be on or after the start date.",
  });

export const taskSchema = z.object({
  id: uuid().optional(),
  projectId: uuid("Choose a project"),
  title: text(160).min(1, "Title is required"),
  description: optText(2000),
  assigneeId: z
    .preprocess((v) => (v === "" ? undefined : v), z.string().optional())
    .transform((v) => v ?? null),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "in_review", "done"]),
  dueDate: optDate,
});

export const invoiceSchema = z
  .object({
    id: uuid().optional(),
    customerId: uuid("Choose a customer"),
    projectId: optUuid,
    issueDate: date,
    dueDate: date,
    discount: z
      .string()
      .default("0")
      .transform((s, ctx) => {
        const v = parseMoney(s || "0");
        if (Number.isNaN(v)) {
          ctx.addIssue({
            code: "custom",
            message: "Discount must be a valid amount",
          });
          return z.NEVER;
        }
        return v;
      }),
    taxBp: z.number().int().min(0).max(10000),
    notes: optText(1000),
    terms: optText(1000),
    items: z
      .array(
        z.object({
          description: text().min(1, "Describe each line item"),
          quantity: z
            .number()
            .int("Quantity must be a whole number")
            .min(1, "Quantity must be at least 1")
            .max(100000),
          unit: money("Unit price"),
        }),
      )
      .min(1, "Add at least one line item")
      .max(50),
  })
  .refine((v) => v.dueDate >= v.issueDate, {
    path: ["dueDate"],
    message: "Due date must be on or after the issue date.",
  });

export const paymentSchema = z
  .object({
    invoiceId: uuid(),
    amount: money("Amount"),
    paidOn: date,
    method: z.enum(["bank_transfer", "card", "cash", "pos", "other"]),
    reference: optText(80),
  })
  .refine((v) => v.amount > 0, {
    path: ["amount"],
    message: "Amount must be greater than zero.",
  });

export const inviteSchema = z.object({
  email: text(200)
    .email("Enter a valid email address")
    .transform((v) => v.toLowerCase()),
  role: z.enum(["admin", "member", "viewer"]),
});
export const workspaceSchema = z.object({
  name: text(80).min(1, "Business name is required"),
  businessType: optText(60),
  currency: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code")
    .transform((v) => v.toUpperCase()),
  address: optText(300),
  paymentInstructions: optText(500),
  invoicePrefix: z
    .string()
    .regex(/^[A-Z0-9]{2,6}$/, "2–6 capital letters or digits"),
  defaultTaxBp: z.preprocess(
    (v) => Number(v),
    z.number().int().min(0).max(10000),
  ),
});
