import type { Field, Option } from "@/components/forms";
import {
  opts,
  PROJECT_STATUS,
  TASK_STATUS,
  PRIORITY,
  CUSTOMER_STATUS,
  METHODS,
} from "./constants";
import { today } from "./dates";

export const customerFields = (): Field[] => [
  { name: "name", label: "Full name", required: true },
  { name: "company", label: "Company" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone", type: "tel" },
  {
    name: "type",
    label: "Customer type",
    type: "select",
    required: true,
    options: [
      { value: "business", label: "Business" },
      { value: "individual", label: "Individual" },
    ],
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: opts(CUSTOMER_STATUS),
  },
  { name: "notes", label: "Notes", type: "textarea" },
];
export const projectFields = (
  customers: Option[],
  members: Option[],
): Field[] => [
  { name: "name", label: "Project name", required: true },
  {
    name: "customerId",
    label: "Customer",
    type: "select",
    required: true,
    options: customers,
  },
  { name: "description", label: "Description", type: "textarea" },
  { name: "startDate", label: "Start date", type: "date", required: true },
  { name: "dueDate", label: "Deadline", type: "date", required: true },
  {
    name: "budget",
    label: "Budget",
    placeholder: "500000",
    hint: "Amount in the workspace currency.",
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: opts(PROJECT_STATUS),
  },
  {
    name: "members",
    label: "Assigned team members",
    type: "checks",
    options: members,
  },
];
export const projectDefaults = {
  startDate: today(),
  status: "planning",
  budget: "0",
  members: [] as string[],
};
export const taskFields = (projects: Option[], members: Option[]): Field[] => [
  { name: "title", label: "Title", required: true },
  {
    name: "projectId",
    label: "Project",
    type: "select",
    required: true,
    options: projects,
  },
  { name: "assigneeId", label: "Assignee", type: "select", options: members },
  {
    name: "priority",
    label: "Priority",
    type: "select",
    required: true,
    options: opts(PRIORITY),
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: opts(TASK_STATUS),
  },
  { name: "dueDate", label: "Due date", type: "date" },
  { name: "description", label: "Description", type: "textarea" },
];
export const paymentFields = (balance: string): Field[] => [
  {
    name: "amount",
    label: "Amount",
    required: true,
    hint: `Outstanding balance: ${balance}`,
  },
  { name: "paidOn", label: "Payment date", type: "date", required: true },
  {
    name: "method",
    label: "Method",
    type: "select",
    required: true,
    options: opts(METHODS),
  },
  { name: "reference", label: "Reference (optional)" },
];
