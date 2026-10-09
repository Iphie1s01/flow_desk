import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, Text, Flex, Progress, Box } from '@/components/ui';
import { Avatar, Card, EmptyState, ExportButton, PageHeader, RowLink, Status } from '@/components/ui';
import { Filters, FormModal } from '@/components/forms';
import { Kanban } from '@/components/boards';
import { ViewToggle } from '@/components/view-toggle';
import { getCtx } from '@/lib/session';
import { customerOptions, listProjects, memberOptions } from '@/lib/queries';
import { saveProject, setProjectStatus } from '@/app/actions';
import { projectDefaults, projectFields } from '@/lib/fields';
import { opts, PROJECT_STATUS } from '@/lib/constants';
import { dueState, fmtShort, addDays, today } from '@/lib/dates';
export const metadata = { title: 'Projects' };

const Team = ({ m }: { m: { id: string; name: string }[] }) => <Flex>{m.slice(0, 4).map((x, i) => <Box key={x.id} ml={i ? -2 : 0}><Avatar name={x.name} /></Box>)}</Flex>;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams; const ctx = await getCtx();
  const [projects, customers, members] = await Promise.all([listProjects(ctx, sp), customerOptions(ctx), memberOptions(ctx)]);
  const view = sp.view === 'board' ? 'board' : 'list'; const pct = (p: any) => (p.tasks ? Math.round((p.done * 100) / p.tasks) : 0);
  const add = ctx.isAdmin && customers.length > 0 && <FormModal title="New project" trigger="+ New project" action={saveProject} fields={projectFields(customers, members)} values={{ ...projectDefaults, dueDate: addDays(today(), 30), customerId: sp.customer ?? customers[0]?.value, members: [ctx.user.id] }} redirect="/projects/{id}" toastMsg="Project created" defaultOpen={sp.new === '1'} />;
  return (
    <>
      <PageHeader title="Projects" sub={`${projects.length} project${projects.length === 1 ? '' : 's'}`} actions={<><ExportButton href="/api/export/projects" />{add}</>} />
      <Flex gap={2} wrap="wrap"><Filters fields={[{ name: 'q', label: 'Search projects or customers', type: 'search' }]} /><ViewToggle value={view} /></Flex>
      {!projects.length ? <Card><EmptyState title="No projects found" text={customers.length ? 'Create a project to organise work for a customer.' : 'Add a customer first, then create projects for them.'} action={add || undefined} /></Card>
        : view === 'board' ? <Kanban columns={opts(PROJECT_STATUS)} move={ctx.isAdmin ? setProjectStatus : async () => ({ ok: false as const, error: 'Only admins can move projects.' })}
            cards={projects.map((p: any) => ({ id: p.id, col: p.status, title: p.name, sub: p.customer_name, href: `/projects/${p.id}`, meta: `Due ${fmtShort(p.due_date)} · ${p.tasks} tasks`, footer: <Progress value={pct(p)} size="xs" colorScheme="green" bg="line" borderRadius="full" /> }))} />
        : <Card p={0}><TableContainer><Table><Thead><Tr><Th>Project</Th><Th>Customer</Th><Th>Status</Th><Th>Deadline</Th><Th>Team</Th><Th>Progress</Th></Tr></Thead><Tbody>
          {projects.map((p: any) => { const s = dueState(p.due_date, p.status === 'completed'); return (
            <RowLink key={p.id} href={`/projects/${p.id}`}><Td fontWeight={600}>{p.name}</Td><Td>{p.customer_name}</Td><Td><Status value={p.status} /></Td><Td color={s === 'overdue' ? 'danger' : undefined}>{fmtShort(p.due_date)}{s === 'overdue' ? ' · overdue' : ''}</Td><Td><Team m={p.members} /></Td>
              <Td minW="150px"><Flex align="center" gap={2}><Progress value={pct(p)} size="xs" colorScheme="green" bg="line" borderRadius="full" flex={1} /><Text fontFamily="mono" fontSize="12px">{pct(p)}%</Text></Flex><Text fontSize="xs" color="mute">{p.done}/{p.tasks} tasks</Text></Td></RowLink>); })}
        </Tbody></Table></TableContainer></Card>}
    </>
  );
}
