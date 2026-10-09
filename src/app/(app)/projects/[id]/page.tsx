import { notFound } from 'next/navigation';
import { Box, Flex, Table, Thead, Tbody, Tr, Th, Td, TableContainer, Tabs, TabList, Tab, TabPanels, TabPanel, Text, Progress } from '@/components/ui';
import { Avatar, Card, EmptyState, PageHeader, RowLink, StatStrip, Status, TextLink } from '@/components/ui';
import { FormModal } from '@/components/forms';
import { FilesPanel } from '@/components/misc';
import { StatusSelect } from '@/components/boards';
import { TaskTable } from '@/components/task-table';
import { TrackRecent } from '@/components/shell';
import { getCtx } from '@/lib/session';
import { customerOptions, getProject, memberOptions, projectOptions } from '@/lib/queries';
import { saveProject, saveTask, setProjectStatus } from '@/app/actions';
import { projectFields, taskFields } from '@/lib/fields';
import { opts, PROJECT_STATUS } from '@/lib/constants';
import { formatMoney, toInput } from '@/lib/money';
import { ago, fmtDate } from '@/lib/dates';
import { storageEnabled } from '@/lib/storage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ctx = await getCtx(); const d = await getProject(ctx, id); if (!d) notFound();
  const [customers, members, projects] = await Promise.all([customerOptions(ctx), memberOptions(ctx), projectOptions(ctx)]);
  const { p, tasks, files, invoices, activity } = d; const fmt = (n: number) => formatMoney(n, ctx.ws.currency);
  const done = tasks.filter((t: any) => t.status === 'done').length, pct = tasks.length ? Math.round((done * 100) / tasks.length) : 0;
  const live = invoices.filter((i: any) => !['draft', 'void'].includes(i.status)); const billed = live.reduce((a: number, i: any) => a + i.total_minor, 0), paid = live.reduce((a: number, i: any) => a + i.paid_minor, 0);
  return (
    <>
      <TrackRecent title={p.name} href={`/projects/${p.id}`} kind="Project" />
      <PageHeader title={p.name} sub={<><TextLink href={`/customers/${p.customer_id}`}>{p.customer_name}</TextLink> · {fmtDate(p.start_date)} → {fmtDate(p.due_date)}</>}
        actions={<>{ctx.isAdmin && <StatusSelect id={p.id} value={p.status} options={opts(PROJECT_STATUS)} action={setProjectStatus} width="140px" />}{!ctx.isAdmin && <Status value={p.status} />}
          {ctx.isAdmin && <FormModal title="Edit project" trigger="Edit" variant="outline" action={saveProject} fields={projectFields(customers, members)} values={{ ...p, customerId: p.customer_id, startDate: p.start_date, dueDate: p.due_date, description: p.description ?? '', budget: toInput(p.budget_minor), members: d.members.map((m: any) => m.user_id) }} extra={{ id: p.id }} />}
          {ctx.canWrite && <FormModal title="New task" trigger="+ Task" action={saveTask} fields={taskFields(projects, members)} values={{ priority: 'medium', status: 'todo', projectId: p.id, assigneeId: ctx.user.id }} toastMsg="Task created" />}</>} />
      <StatStrip stats={[{ label: 'Progress', value: `${pct}%`, sub: `${done}/${tasks.length} tasks done` }, { label: 'Budget', value: fmt(p.budget_minor) }, ...(ctx.canFinance ? [{ label: 'Invoiced', value: fmt(billed) }, { label: 'Outstanding', value: fmt(billed - paid) }] : [])]} />
      <Tabs variant="line" colorScheme="orange" isLazy>
        <TabList><Tab>Overview</Tab><Tab>Tasks ({tasks.length})</Tab><Tab>Files ({files.length})</Tab><Tab>Activity</Tab>{ctx.canFinance && <Tab>Financials</Tab>}</TabList>
        <TabPanels>
          <TabPanel px={0}><Card title="About"><Text mb={3} whiteSpace="pre-wrap">{p.description || 'No description yet.'}</Text><Progress value={pct} colorScheme="green" size="sm" bg="line" borderRadius="full" mb={3} />
            <Text fontFamily="mono" fontSize="11px" color="mute" mb={2}>TEAM</Text><Flex gap={3} wrap="wrap">{d.members.map((m: any) => <Flex key={m.user_id} align="center" gap={2}><Avatar name={m.name} />{m.name}</Flex>)}</Flex></Card></TabPanel>
          <TabPanel px={0}><Card p={0}><TaskTable tasks={tasks} projects={projects} members={members} canWrite={ctx.canWrite} showProject={false} me={ctx.user.id} isAdmin={ctx.isAdmin} /></Card></TabPanel>
          <TabPanel px={0}><Card><FilesPanel projectId={p.id} files={files} enabled={storageEnabled()} canUpload={ctx.canWrite} canDeleteAll={ctx.isAdmin} me={ctx.user.id} /></Card></TabPanel>
          <TabPanel px={0}><Card>{activity.length ? activity.map((a: any, i: number) => <Flex key={i} justify="space-between" py={2} borderBottom="1px solid" borderColor="line"><Text><b>{a.actor ?? 'Someone'}</b> {a.summary}</Text><Text color="mute" fontSize="sm">{ago(a.created_at)}</Text></Flex>) : <Text color="mute">No activity yet.</Text>}</Card></TabPanel>
          {ctx.canFinance && <TabPanel px={0}><Card p={0}>{invoices.length ? <TableContainer><Table><Thead><Tr><Th>Invoice</Th><Th isNumeric>Total</Th><Th isNumeric>Paid</Th><Th isNumeric>Balance</Th><Th>Status</Th></Tr></Thead><Tbody>{invoices.map((i: any) => <RowLink key={i.id} href={`/invoices/${i.id}`}><Td fontFamily="mono">{i.number}</Td><Td isNumeric fontFamily="mono">{fmt(i.total_minor)}</Td><Td isNumeric fontFamily="mono">{fmt(i.paid_minor)}</Td><Td isNumeric fontFamily="mono">{i.status === 'void' ? '—' : fmt(i.balance_minor)}</Td><Td><Status value={i.status} /></Td></RowLink>)}</Tbody></Table></TableContainer> : <EmptyState title="No invoices for this project" text="Link an invoice to this project when you create it." />}</Card></TabPanel>}
        </TabPanels>
      </Tabs>
    </>
  );
}
