import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { tx } from '@/lib/db';
import { Onboarding } from '@/components/onboarding';
export const metadata = { title: 'Set up your workspace' };
export default async function Page() {
  const user = await requireUser();
  const has = await tx(user.id, async c => (await c.query('select 1 from workspace_members where user_id = $1 limit 1', [user.id])).rowCount);
  if (has) redirect('/overview');
  return <Onboarding name={user.name} />;
}
