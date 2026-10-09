import { getCtx } from '@/lib/session';
import { getNotifications, syncDeadlineNotifications } from '@/lib/queries';
import { Shell } from '@/components/shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx();
  await syncDeadlineNotifications(ctx);
  const n = await getNotifications(ctx);
  return <Shell user={{ name: ctx.user.name, email: ctx.user.email }} ws={{ name: ctx.ws.name }} workspaces={ctx.workspaces} role={ctx.role} canFinance={ctx.canFinance}
    notes={n.rows.map(r => ({ ...r, created_at: new Date(r.created_at).toISOString(), read_at: r.read_at ? new Date(r.read_at).toISOString() : null }))} unread={n.unread}>{children}</Shell>;
}
