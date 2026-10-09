import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import { InvoiceForm } from '@/components/invoice-form';
import { getCtx } from '@/lib/session';
import { customerOptions, getInvoice, projectOptions } from '@/lib/queries';
import { toInput } from '@/lib/money';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await getCtx(); if (!ctx.isAdmin) notFound(); const d = await getInvoice(ctx, id); if (!d || d.inv.status !== 'draft') notFound();
  const [customers, projects] = await Promise.all([customerOptions(ctx), projectOptions(ctx)]); const i = d.inv;
  return <><PageHeader title={`Edit ${i.number}`} sub="Drafts can be edited freely. Issued invoices are locked." />
    <InvoiceForm currency={ctx.ws.currency} customers={customers} projects={projects} init={{ id: i.id, customerId: i.customer_id, projectId: i.project_id ?? '', issueDate: i.issue_date, dueDate: i.due_date, discount: toInput(i.discount_minor), taxPct: String(i.tax_bp / 100), notes: i.notes ?? '', terms: i.terms ?? '', items: d.items.map((x: any) => ({ description: x.description, quantity: String(x.quantity), unit: toInput(x.unit_price_minor) })) }} /></>;
}
