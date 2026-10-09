import { Flex, Text } from '@/components/ui';
import { Avatar, Card, EmptyState, PageHeader } from '@/components/ui';
import { Filters, Pager } from '@/components/forms';
import { getCtx } from '@/lib/session';
import { listActivity } from '@/lib/queries';
import { ago } from '@/lib/dates';
export const metadata = { title: 'Activity' };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams; const ctx = await getCtx(); const d = await listActivity(ctx, sp);
  return (
    <>
      <PageHeader title="Activity" sub="A permanent record of who did what. Entries cannot be edited or deleted." />
      <Filters fields={[{ name: 'type', label: 'All activity', type: 'select', options: ['customer', 'project', 'task', 'invoice', 'payment', 'member', 'workspace'].filter(t => ctx.canFinance || !['invoice', 'payment'].includes(t)).map(t => ({ value: t, label: t[0].toUpperCase() + t.slice(1) + 's' })) }]} />
      <Card>{d.rows.length ? d.rows.map((a: any) => <Flex key={a.id} align="center" justify="space-between" gap={3} py={2.5} borderBottom="1px solid" borderColor="line"><Flex align="center" gap={3}><Avatar name={a.actor ?? '?'} /><Text><b>{a.actor ?? 'Former member'}</b> {a.summary}</Text></Flex><Text color="mute" fontSize="sm" flexShrink={0}>{ago(a.created_at)}</Text></Flex>) : <EmptyState title="No activity yet" text="Actions in this workspace will be recorded here." />}</Card>
      {d.total > 25 && <Pager page={d.page} pages={d.pages} total={d.total} />}
    </>
  );
}
