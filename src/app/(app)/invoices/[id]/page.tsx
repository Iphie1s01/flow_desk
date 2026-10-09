import { notFound } from 'next/navigation';
import { Box, Flex, Text } from '@/components/ui';
import { Card, LinkButton, PageHeader } from '@/components/ui';
import { FormModal } from '@/components/forms';
import { InvoiceDoc } from '@/components/invoice-doc';
import { PrintButton } from '@/components/misc';
import { TrackRecent } from '@/components/shell';
import { getCtx } from '@/lib/session';
import { getInvoice } from '@/lib/queries';
import { deleteDraftInvoice, issueInvoice, recordPayment, voidInvoice } from '@/app/actions';
import { paymentFields } from '@/lib/fields';
import { formatMoney, toInput } from '@/lib/money';
import { fmtDate, today } from '@/lib/dates';
import { LABEL } from '@/lib/constants';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await getCtx(); if (!ctx.canFinance) notFound(); const d = await getInvoice(ctx, id); if (!d) notFound();
  const { inv, items, payments } = d; const fmt = (n: number) => formatMoney(n, ctx.ws.currency); const open = ['sent', 'partially_paid', 'overdue'].includes(inv.status);
  return (
    <>
      <TrackRecent title={inv.number} href={`/invoices/${inv.id}`} kind="Invoice" />
      <PageHeader title={inv.number} sub={`${inv.customer_name} · ${LABEL[inv.status]}`} actions={<>
        {ctx.isAdmin && inv.status === 'draft' && <><LinkButton href={`/invoices/${inv.id}/edit`} variant="outline">Edit draft</LinkButton><FormModal title="Issue this invoice?" trigger="Issue invoice" action={issueInvoice} fields={[]} extra={{ id: inv.id }} submit="Issue" note="Once issued the amounts are locked. You can still record payments or void it." toastMsg="Invoice issued" /></>}
        {ctx.isAdmin && open && <FormModal title="Record payment" trigger="Record payment" action={recordPayment} fields={paymentFields(fmt(inv.balance_minor))} values={{ amount: toInput(inv.balance_minor), paidOn: today(), method: 'bank_transfer' }} extra={{ invoiceId: inv.id }} submit="Record payment" toastMsg="Payment recorded" />}
        <PrintButton />
        {ctx.isAdmin && inv.status === 'draft' && <FormModal title="Delete this draft?" trigger="Delete" variant="outline" action={deleteDraftInvoice} fields={[]} extra={{ id: inv.id }} submit="Delete" danger redirect="/invoices" />}
        {ctx.isAdmin && !['void', 'draft'].includes(inv.status) && inv.paid_minor === 0 && <FormModal title="Void this invoice?" trigger="Void" variant="outline" action={voidInvoice} fields={[]} extra={{ id: inv.id }} submit="Void invoice" danger note="Voided invoices stay on record for audit but leave your revenue and receivables." />}</>} />
      <Card id="print-area"><InvoiceDoc inv={inv} items={items} ws={ctx.ws} /></Card>
      <Card title="Payments" className="no-print">{payments.length ? payments.map((p: any) => <Flex key={p.id} justify="space-between" py={2} borderBottom="1px solid" borderColor="line"><Text>{fmtDate(p.paid_on)} · {LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ''}</Text><Text fontFamily="mono">{fmt(p.amount_minor)}</Text></Flex>) : <Text color="mute">No payments recorded yet.</Text>}</Card>
    </>
  );
}
