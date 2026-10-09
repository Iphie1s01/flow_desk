import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui';
import { InvoiceForm } from '@/components/invoice-form';
import { getCtx } from '@/lib/session';
import { customerOptions, projectOptions } from '@/lib/queries';
import { addDays, today } from '@/lib/dates';
export const metadata = { title: 'New invoice' };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams; const ctx = await getCtx(); if (!ctx.isAdmin) notFound();
  const [customers, projects] = await Promise.all([customerOptions(ctx), projectOptions(ctx)]);
  return <><PageHeader title="New invoice" sub="Totals are calculated from the line items. Nothing is typed in by hand." />
    <InvoiceForm currency={ctx.ws.currency} customers={customers} projects={projects} init={{ customerId: sp.customer ?? '', projectId: sp.project ?? '', issueDate: today(), dueDate: addDays(today(), 30), discount: '0', taxPct: String(ctx.ws.default_tax_bp / 100), notes: '', terms: 'Payment due within 30 days.', items: [{ description: '', quantity: '1', unit: '' }] }} /></>;
}
