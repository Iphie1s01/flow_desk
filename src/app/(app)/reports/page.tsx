import { notFound } from 'next/navigation';
import { SimpleGrid, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Text } from '@/components/ui';
import { Card, EmptyState, ExportButton, PageHeader, StatStrip } from '@/components/ui';
import { Filters } from '@/components/forms';
import { BarList, RevenueChart } from '@/components/charts';
import { getCtx } from '@/lib/session';
import { reportData } from '@/lib/queries';
import { formatMoney } from '@/lib/money';
import { addDays, today } from '@/lib/dates';
import { LABEL } from '@/lib/constants';
export const metadata = { title: 'Reports' };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams; const ctx = await getCtx(); if (!ctx.canFinance) notFound();
  const ok = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined); const from = ok(sp.from) ?? addDays(today(), -179), to = ok(sp.to) ?? today();
  const r = await reportData(ctx, from, to); const fmt = (n: number) => formatMoney(n, ctx.ws.currency); const qs = `from=${from}&to=${to}`;
  const chg = r.cmp.prev > 0 ? Math.round(((r.cmp.cur - r.cmp.prev) * 100) / r.cmp.prev) : null;
  const data = (rows: any[]) => rows.map(x => ({ label: x.label, value: x.value / 100 }));
  return (
    <>
      <PageHeader title="Reports" sub={`${from} to ${to}. Revenue here means payments collected. Profit is not calculated because expenses are not tracked.`} />
      <Filters fields={[{ name: 'from', label: 'From', type: 'date' }, { name: 'to', label: 'To', type: 'date' }]} />
      <StatStrip stats={[{ label: 'Collected', value: fmt(r.cmp.cur), sub: chg === null ? 'No earlier period to compare' : `${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg)}% vs previous period` }, { label: 'Avg. days to payment', value: r.avg ?? '—', sub: 'fully paid invoices' }, { label: 'Projects completed', value: r.pr.completed, sub: `${r.pr.on_time} on time` }, { label: 'Overdue projects', value: r.pr.overdue, sub: `${r.pr.active} active` }]} />
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        <Card title="Revenue by month" action={<ExportButton href={`/api/export/payments?${qs}`} />}>{r.byMonth.length ? <RevenueChart currency={ctx.ws.currency} data={data(r.byMonth)} /> : <EmptyState title="No payments in this range" text="Pick a wider date range." />}</Card>
        <Card title="Revenue by customer" action={<ExportButton href={`/api/export/revenue-by-customer?${qs}`} />}><BarList title="Revenue by customer" data={data(r.byCustomer)} currency={ctx.ws.currency} /></Card>
        <Card title="Revenue by project"><BarList title="Revenue by project" data={data(r.byProject)} currency={ctx.ws.currency} /></Card>
        <Card title="Invoices issued in range" action={<ExportButton href={`/api/export/invoices?${qs}`} />}>{r.invStatus.length ? <TableContainer><Table size="sm"><Thead><Tr><Th>Status</Th><Th isNumeric>Count</Th><Th isNumeric>Total</Th><Th isNumeric>Outstanding</Th></Tr></Thead><Tbody>{r.invStatus.map((x: any) => <Tr key={x.label}><Td>{LABEL[x.label]}</Td><Td isNumeric>{x.count}</Td><Td isNumeric fontFamily="mono">{fmt(x.total)}</Td><Td isNumeric fontFamily="mono">{x.label === 'void' ? '—' : fmt(x.balance)}</Td></Tr>)}</Tbody></Table></TableContainer> : <Text color="mute">No invoices issued in this range.</Text>}</Card>
        <Card title="Work by team member" action={<ExportButton href={`/api/export/tasks?${qs}`} />}><TableContainer><Table size="sm"><Thead><Tr><Th>Member</Th><Th isNumeric>Completed</Th><Th isNumeric>Open</Th><Th isNumeric>Overdue</Th></Tr></Thead><Tbody>{r.taskRows.map((x: any) => <Tr key={x.label}><Td>{x.label}</Td><Td isNumeric>{x.done}</Td><Td isNumeric>{x.open}</Td><Td isNumeric color={x.overdue ? 'danger' : undefined}>{x.overdue}</Td></Tr>)}</Tbody></Table></TableContainer></Card>
      </SimpleGrid>
    </>
  );
}
