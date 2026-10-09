import { notFound } from 'next/navigation';
import { Table, Thead, Tbody, Tr, Th, Td, TableContainer } from '@/components/ui';
import { Card, EmptyState, ExportButton, PageHeader, RowLink } from '@/components/ui';
import { Filters, Pager } from '@/components/forms';
import { getCtx } from '@/lib/session';
import { listPayments } from '@/lib/queries';
import { METHODS, LABEL, opts } from '@/lib/constants';
import { formatMoney } from '@/lib/money';
import { fmtDate } from '@/lib/dates';
export const metadata = { title: 'Payments' };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams; const ctx = await getCtx(); if (!ctx.canFinance) notFound(); const d = await listPayments(ctx, sp); const fmt = (n: number) => formatMoney(n, ctx.ws.currency);
  const qs = new URLSearchParams({ ...(sp.from ? { from: sp.from } : {}), ...(sp.to ? { to: sp.to } : {}) }).toString();
  return (
    <>
      <PageHeader title="Payments" sub={`${d.total} payment${d.total === 1 ? '' : 's'} · ${fmt(d.sum)} collected`} actions={<ExportButton href={`/api/export/payments?${qs}`} />} />
      <Filters fields={[{ name: 'q', label: 'Search invoice, customer, reference', type: 'search' }, { name: 'method', label: 'All methods', type: 'select', options: opts(METHODS) }, { name: 'from', label: 'From', type: 'date' }, { name: 'to', label: 'To', type: 'date' }]} />
      <Card p={0}>{d.rows.length ? <TableContainer><Table><Thead><Tr><Th>Date</Th><Th>Invoice</Th><Th>Customer</Th><Th>Method</Th><Th>Reference</Th><Th isNumeric>Amount</Th></Tr></Thead><Tbody>
        {d.rows.map((p: any) => <RowLink key={p.id} href={`/invoices/${p.invoice_id}`}><Td>{fmtDate(p.paid_on)}</Td><Td fontFamily="mono">{p.number}</Td><Td fontWeight={600}>{p.customer_name}</Td><Td>{LABEL[p.method]}</Td><Td color="mute">{p.reference ?? '—'}</Td><Td isNumeric fontFamily="mono">{fmt(p.amount_minor)}</Td></RowLink>)}</Tbody></Table></TableContainer>
        : <EmptyState title="No payments recorded" text="Open an issued invoice and choose Record payment." />}</Card>
      {d.total > 0 && <Pager page={d.page} pages={d.pages} total={d.total} />}
    </>
  );
}
