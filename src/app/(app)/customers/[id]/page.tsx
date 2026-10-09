import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import { Box, Flex, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Tabs, TabList, Tab, TabPanels, TabPanel, Text } from '@/components/ui';
import { Card, EmptyState, LinkButton, PageHeader, RowLink, StatStrip, Status } from '@/components/ui';
import { ActionForm, FormModal } from '@/components/forms';
import { TrackRecent } from '@/components/shell';
import { getCtx } from '@/lib/session';
import { getCustomer } from '@/lib/queries';
import { archiveCustomer, saveCustomer, saveCustomerNotes } from '@/app/actions';
import { customerFields } from '@/lib/fields';
import { formatMoney } from '@/lib/money';
import { ago, fmtDate } from '@/lib/dates';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await getCtx(); const d = await getCustomer(ctx, id); if (!d) notFound();
  const { cust: c, projects, invoices, activity } = d; const fmt = (n: number) => formatMoney(n, ctx.ws.currency);
  const live = invoices.filter((i: any) => !['draft', 'void'].includes(i.status)); const billed = live.reduce((a: number, i: any) => a + i.total_minor, 0), paid = live.reduce((a: number, i: any) => a + i.paid_minor, 0);
  return (
    <>
      <TrackRecent title={c.name} href={`/customers/${c.id}`} kind="Customer" />
      <PageHeader title={c.name} sub={<>{c.company ?? 'No company'} {c.email && `· ${c.email}`} {c.phone && `· ${c.phone}`} &nbsp;<Status value={c.status} /></>}
        actions={ctx.isAdmin && <><FormModal title="Edit customer" trigger="Edit" variant="outline" action={saveCustomer} fields={customerFields()} values={c} extra={{ id: c.id }} />
          <LinkButton href={`/projects?new=1&customer=${c.id}`}>Create project</LinkButton>
          <FormModal title="Archive this customer?" trigger="Archive" variant="outline" action={archiveCustomer} fields={[]} extra={{ id: c.id }} submit="Archive" danger redirect="/customers" toastMsg="Customer archived" /></>} />
      <StatStrip stats={[...(ctx.canFinance ? [{ label: 'Total billed', value: fmt(billed) }, { label: 'Total paid', value: fmt(paid) }, { label: 'Outstanding', value: fmt(billed - paid) }] : []), { label: 'Projects', value: projects.length }]} />
      <Tabs variant="line" colorScheme="orange" isLazy>
        <TabList><Tab>Overview</Tab><Tab>Projects</Tab>{ctx.canFinance && <Tab>Invoices</Tab>}<Tab>Activity</Tab><Tab>Notes</Tab></TabList>
        <TabPanels>
          <TabPanel px={0}><Card title="Details"><Box as="dl" display="grid" gridTemplateColumns="140px 1fr" rowGap={2}>{[['Type', c.type], ['Email', c.email ?? '—'], ['Phone', c.phone ?? '—'], ['Customer since', fmtDate(c.created_at)]].map(([k, v]) => <Fragment key={k}><Text color="mute">{k}</Text><Text textTransform={k === 'Type' ? 'capitalize' : undefined}>{v}</Text></Fragment>)}</Box></Card></TabPanel>
          <TabPanel px={0}><Card p={0}>{projects.length ? <TableContainer><Table><Thead><Tr><Th>Project</Th><Th>Status</Th><Th>Deadline</Th></Tr></Thead><Tbody>{projects.map((p: any) => <RowLink key={p.id} href={`/projects/${p.id}`}><Td fontWeight={600}>{p.name}</Td><Td><Status value={p.status} /></Td><Td>{fmtDate(p.due_date)}</Td></RowLink>)}</Tbody></Table></TableContainer> : <EmptyState title="No projects yet" text="Projects you create for this customer appear here." />}</Card></TabPanel>
          {ctx.canFinance && <TabPanel px={0}><Card p={0}>{invoices.length ? <TableContainer><Table><Thead><Tr><Th>Invoice</Th><Th>Issued</Th><Th isNumeric>Total</Th><Th isNumeric>Balance</Th><Th>Status</Th></Tr></Thead><Tbody>{invoices.map((i: any) => <RowLink key={i.id} href={`/invoices/${i.id}`}><Td fontFamily="mono">{i.number}</Td><Td>{fmtDate(i.issue_date)}</Td><Td isNumeric fontFamily="mono">{fmt(i.total_minor)}</Td><Td isNumeric fontFamily="mono">{i.status === 'void' ? '—' : fmt(i.balance_minor)}</Td><Td><Status value={i.status} /></Td></RowLink>)}</Tbody></Table></TableContainer> : <EmptyState title="No invoices yet" text="Invoices for this customer appear here." />}</Card></TabPanel>}
          <TabPanel px={0}><Card>{activity.length ? activity.map((a: any, i: number) => <Flex key={i} justify="space-between" py={2} borderBottom="1px solid" borderColor="line"><Text>{a.summary}</Text><Text color="mute" fontSize="sm">{ago(a.created_at)}</Text></Flex>) : <Text color="mute">No recorded activity for this customer yet.</Text>}</Card></TabPanel>
          <TabPanel px={0}><Card title="Notes">{ctx.isAdmin ? <ActionForm action={saveCustomerNotes} extra={{ id: c.id }} values={{ notes: c.notes }} fields={[{ name: 'notes', label: 'Private notes', type: 'textarea' }]} toastMsg="Notes saved" /> : <Text whiteSpace="pre-wrap">{c.notes || 'No notes.'}</Text>}</Card></TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
}
