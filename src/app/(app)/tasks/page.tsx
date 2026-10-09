import { Card, ExportButton, PageHeader, EmptyState } from '@/components/ui';
import { Flex } from '@/components/ui';
import { Filters, FormModal } from '@/components/forms';
import { Kanban } from '@/components/boards';
import { TaskTable } from '@/components/task-table';
import { ViewToggle } from '@/components/view-toggle';
import { getCtx } from '@/lib/session';
import { listTasks, memberOptions, projectOptions } from '@/lib/queries';
import { saveTask, setTaskStatus } from '@/app/actions';
import { taskFields } from '@/lib/fields';
import { opts, PRIORITY, TASK_STATUS } from '@/lib/constants';
import { fmtShort } from '@/lib/dates';
export const metadata = { title: 'Tasks' };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams; const ctx = await getCtx();
  const [tasks, projects, members] = await Promise.all([listTasks(ctx, sp), projectOptions(ctx), memberOptions(ctx)]);
  const view = sp.view === 'board' ? 'board' : 'list'; const overdue = tasks.filter((t: any) => t.status !== 'done' && t.due_date && t.due_date < new Date().toISOString().slice(0, 10)).length;
  const canCreate = ctx.canWrite && projects.length > 0;
  return (
    <>
      <PageHeader title="Tasks" sub={`${tasks.length} shown · ${overdue} overdue`} actions={<><ExportButton href="/api/export/tasks" />{canCreate && <FormModal title="New task" trigger="+ New task" action={saveTask} fields={taskFields(projects, members)} values={{ priority: 'medium', status: 'todo', assigneeId: ctx.user.id, projectId: projects[0]?.value }} toastMsg="Task created" defaultOpen={sp.new === '1'} />}</>} />
      <Flex gap={2} wrap="wrap" align="flex-start">
        <Filters fields={[{ name: 'q', label: 'Search tasks', type: 'search' }, { name: 'priority', label: 'All priorities', type: 'select', options: opts(PRIORITY) }, { name: 'status', label: 'All statuses', type: 'select', options: [...opts(TASK_STATUS), { value: 'overdue', label: 'Overdue' }] }]}
          presets={[{ label: 'My tasks', params: { mine: '1' } }, { label: 'My overdue tasks', params: { mine: '1', status: 'overdue' } }]} />
        <ViewToggle value={view} />
      </Flex>
      {view === 'board'
        ? <Kanban columns={opts(TASK_STATUS)} move={setTaskStatus} cards={tasks.map((t: any) => ({ id: t.id, col: t.status, title: t.title, sub: `${t.project_name}${t.assignee_name ? ' · ' + t.assignee_name : ''}`, meta: t.due_date ? `Due ${fmtShort(t.due_date)}` : undefined }))} />
        : <Card p={0}><TaskTable tasks={tasks} projects={projects} members={members} canWrite={ctx.canWrite} me={ctx.user.id} isAdmin={ctx.isAdmin} /></Card>}
    </>
  );
}
