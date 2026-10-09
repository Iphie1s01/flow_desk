import { Box, Flex, Heading, SimpleGrid, Text, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Progress, Tag } from '@/components/ui';
import { Card, EmptyState, PageHeader, RowLink, StatStrip, Status, TextLink } from '@/components/ui';
import { Filters } from '@/components/forms';
import { RevenueChart } from '@/components/charts';
import { getCtx } from '@/lib/session';
import { overview } from '@/lib/queries';
import { formatMoney } from '@/lib/money';
import { dueState, fmtShort } from '@/lib/dates';
export const metadata = { title: 'Overview' };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams; const ctx = await getCtx(); const o = await overview(ctx, sp.days); const fmt = (n: number) => formatMoney(n, ctx.ws.currency);
  const h = new Date().getHours(); const first = ctx.user.name.split(' ')[0];
  const health: { title: string; text: string; href: string }[] = [];
  if (o.fin) {
    if (o.fin.inv.overdue) health.push({ title: `${o.fin.inv.overdue} invoice${o.fin.inv.overdue > 1 ? 's are' : ' is'} overdue`, text: `${fmt(o.fin.inv.overdue_amount)} is past due. Follow up with the customers.`, href: '/invoices?status=overdue' });
    if (o.fin.inv.outstanding) health.push({ title: `${fmt(o.fin.inv.outstanding)} remains outstanding`, text: `Across ${o.fin.inv.unpaid} unpaid invoice${o.fin.inv.unpaid > 1 ? 's' : ''}.`, href: '/invoices' });
  }
  if (o.tasks.overdue) health.push({ title: `${o.tasks.overdue} task${o.tasks.overdue > 1 ? 's are' : ' is'} past deadline`, text: 'Reassign or reschedule them.', href: '/tasks?status=overdue' });
  if (o.stale.length) health.push({ title: `${o.stale.length} active project${o.stale.length > 1 ? 's have' : ' has'} no recent activity`, text: `No task changes in 21 days: ${o.stale.map((p: any) => p.name).join(', ')}.`, href: '/projects' });
  const change = o.fin && o.fin.rev.prev > 0 ? Math.round(((o.fin.rev.cur - o.fin.rev.prev) * 100) / o.fin.rev.prev) : null;
  const stats = o.fin ? [
    { label: 'Collected revenue', value: fmt(o.fin.rev.cur), sub: change === null ? 'No earlier payments to compare' : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}% vs previous ${o.days} days` },
    { label: 'Active projects', value: o.proj.active, sub: `${o.proj.completed} completed · ${o.proj.overdue} overdue` },
    { label: 'Outstanding', value: fmt(o.fin.inv.outstanding), sub: `${o.fin.inv.unpaid} unpaid · ${o.fin.inv.overdue} overdue` },
    { label: 'Active customers', value: o.cust.active, sub: `${o.cust.fresh} new in period` },
  ] : [
    { label: 'My open tasks', value: o.tasks.mine, sub: 'assigned to you' }, { label: 'My overdue', value: o.tasks.mine_overdue, sub: 'past deadline' }, { label: 'Active projects', value: o.proj.active, sub: `${o.proj.overdue} overdue` },
  ];
  const chart = o.fin?.series.map((s: any) => ({ label: new Date(s.d + 'T00:00:00Z').toLocaleDateString('en-GB', o.unit === 'month' ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' }), value: s.v / 100 })) ?? [];
  return (
    <>
      <Flex justify="space-between" align="flex-end" wrap="wrap" gap={3} mb={2}>
        <Box><Text fontFamily="mono" fontSize="11px" letterSpacing=".1em" color="accent" textTransform="uppercase">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Heading as="h1" size="2xl" lineHeight="1.05">Good {h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}, <Box as="em" color="accent">{first}</Box>.</Heading>
          <Text color="mute">Here’s what’s happening at {ctx.ws.name} today.</Text></Box>
        {o.fin && <Filters fields={[{ name: 'days', label: 'Last 30 days', type: 'select', options: [{ value: '90', label: 'Last 90 days' }, { value: '365', label: 'Last 12 months' }] }]} />}
      </Flex>
      <StatStrip stats={stats} />
      <SimpleGrid columns={{ base: 1, lg: o.fin ? 3 : 2 }} spacing={4} mb={0}>
        {o.fin && <Box gridColumn={{ lg: 'span 2' }}><Card title={`Collected revenue by ${o.unit}`}>{chart.length ? <RevenueChart data={chart} currency={ctx.ws.currency} /> : <EmptyState title="No payments in this period" text="Record a payment on an invoice and your revenue trend appears here." />}</Card></Box>}
        <Box bg="side" color="#e9e4d3" borderRadius="6px" p={5} mb={4}>
          <Text fontFamily="mono" fontSize="11px" letterSpacing=".08em" textTransform="uppercase" color="#9fb3a6" fontWeight={700} mb={2}>Business health</Text>
          {health.length ? health.map(x => <Box key={x.title} py={3} borderTop="1px solid #ffffff22"><TextLink href={x.href} color="white">{x.title} →</TextLink><Text fontSize="sm" color="#a9b9ae">{x.text}</Text></Box>) : <Text>All clear: nothing overdue, stale or unpaid.</Text>}
          <Text fontSize="11px" color="#7f9486" mt={3}>Rule-based checks. No score, only the records behind each finding.</Text>
        </Box>
      </SimpleGrid>
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        <Card title="Project progress">{o.progress.length ? o.progress.map((p: any) => { const pct = p.total ? Math.round((p.done * 100) / p.total) : 0; return (
          <Box key={p.id} py={2} borderBottom="1px solid" borderColor="line"><Flex justify="space-between"><TextLink href={`/projects/${p.id}`} color="ink">{p.name}</TextLink><Text fontFamily="mono" fontSize="12px">{pct}%</Text></Flex>
            <Progress value={pct} size="xs" colorScheme="green" bg="line" borderRadius="full" my={1} /><Text fontSize="xs" color="mute">{p.customer} · due {fmtShort(p.due_date)} · {p.done}/{p.total} tasks</Text></Box>); }) : <EmptyState title="No active projects" text="Create a project to start tracking progress." />}</Card>
        <Card title="Upcoming deadlines">{o.deadlines.length ? o.deadlines.map((d: any) => { const s = dueState(d.due_date); return (
          <Flex key={d.kind + d.id} justify="space-between" py={2} borderBottom="1px solid" borderColor="line" gap={3}><Box><TextLink href={d.href} color="ink">{d.title}</TextLink><Text fontSize="xs" color="mute">{d.sub}</Text></Box>
            <Flex align="center" gap={2} flexShrink={0}><Tag size="sm" variant="outline" boxShadow="inset 0 0 0 1px currentColor" color={s === 'overdue' ? 'danger' : s === 'today' ? 'warn' : 'info'}>{s === 'overdue' ? 'Overdue' : s === 'today' ? 'Due today' : 'Due soon'}</Tag><Text fontFamily="mono" fontSize="12px">{fmtShort(d.due_date)}</Text></Flex></Flex>); }) : <EmptyState title="Nothing due this week" text="You’re ahead of schedule." />}</Card>
      </SimpleGrid>
      {o.fin && <Card title="Recent transactions"><TableContainer><Table size="sm"><Thead><Tr><Th>Invoice</Th><Th>Customer</Th><Th>Date</Th><Th isNumeric>Amount</Th><Th>Status</Th></Tr></Thead><Tbody>
        {o.fin.recent.map((i: any) => <RowLink key={i.id} href={`/invoices/${i.id}`}><Td fontFamily="mono">{i.number}</Td><Td>{i.customer_name}</Td><Td>{fmtShort(i.issue_date)}</Td><Td isNumeric fontFamily="mono">{fmt(i.total_minor)}</Td><Td><Status value={i.status} /></Td></RowLink>)}</Tbody></Table></TableContainer></Card>}
    </>
  );
}
