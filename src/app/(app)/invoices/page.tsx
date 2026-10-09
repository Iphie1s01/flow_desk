import { Table, Thead, Tbody, Tr, Th, Td, TableContainer } from '@/components/ui';
import { Card, EmptyState, ExportButton, LinkButton, PageHeader, RowLink, Status } from '@/components/ui';
import { Filters, Pager } from '@/components/forms';
import { getCtx } from '@/lib/session';
import { listInvoices } from '@/lib/queries';
import { opts, INVOICE_STATUS } from '@/lib/constants';
import { formatMoney } from '@/lib/money';
import { fmtShort } from '@/lib/dates';
import { notFound } from 'next/navigation';
export const metadata = { title: 'Invoices' };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams; const ctx = await getCtx(); if (!ctx.canFinance) notFound(); const d = await listInvoices(ctx, sp); const fmt = (n: number) => formatMoney(n, ctx.ws.currency);
  return (
    <>
      <PageHeader title="Invoices" sub={`${d.total} invoice${d.total === 1 ? '' : 's'}`} actions={<><ExportButton href="/api/export/invoices" />{ctx.isAdmin && <LinkButton href="/invoices/new">+ New invoice</LinkButton>}</>} />
      <Filters fields={[{ name: 'q', label: 'Search number or customer', type: 'search' }, { name: 'status', label: 'All statuses', type: 'select', options: opts(INVOICE_STATUS) }]} presets={[{ label: 'Unpaid', params: { status: 'sent' } }, { label: 'Overdue', params: { status: 'overdue' } }]} />
      <Card p={0}>{d.rows.length ? <TableContainer><Table><Thead><Tr><Th>Number</Th><Th>Customer</Th><Th>Issued</Th><Th>Due</Th><Th isNumeric>Total</Th><Th isNumeric>Paid</Th><Th isNumeric>Balance</Th><Th>Status</Th></Tr></Thead><Tbody>
        {d.rows.map((i: any) => <RowLink key={i.id} href={`/invoices/${i.id}`}><Td fontFamily="mono">{i.number}</Td><Td fontWeight={600}>{i.customer_name}</Td><Td>{fmtShort(i.issue_date)}</Td><Td>{fmtShort(i.due_date)}</Td><Td isNumeric fontFamily="mono">{fmt(i.total_minor)}</Td><Td isNumeric fontFamily="mono">{fmt(i.paid_minor)}</Td><Td isNumeric fontFamily="mono">{i.status === 'void' ? '—' : fmt(i.balance_minor)}</Td><Td><Status value={i.status} /></Td></RowLink>)}</Tbody></Table></TableContainer>
        : <EmptyState title="No invoices found" text="Create an invoice to start billing your customers." action={ctx.isAdmin ? <LinkButton href="/invoices/new">New invoice</LinkButton> : undefined} />}</Card>
      {d.total > 0 && <Pager page={d.page} pages={d.pages} total={d.total} />}
    </>
  );
}
