import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, Flex, Text } from '@/components/ui';
import { Avatar, Card, PageHeader, Status } from '@/components/ui';
import { ActionForm, FormModal } from '@/components/forms';
import { RoleSelect } from '@/components/misc';
import { getCtx } from '@/lib/session';
import { getTeam } from '@/lib/queries';
import { changeRole, inviteMember, removeMember, resendInvite, revokeInvite } from '@/app/actions';
import { fmtDate } from '@/lib/dates';
export const metadata = { title: 'Team' };

export default async function Page() {
  const ctx = await getCtx(); const { members, invites } = await getTeam(ctx);
  const roleOpts = [{ value: 'member', label: 'Member: assigned work only' }, { value: 'viewer', label: 'Viewer: read-only' }, ...(ctx.isOwner ? [{ value: 'admin', label: 'Admin: manages operations' }] : [])];
  return (
    <>
      <PageHeader title="Team" sub={`${members.length} member${members.length === 1 ? '' : 's'}${invites.length ? ` · ${invites.length} invited` : ''}`}
        actions={ctx.isAdmin && <FormModal title="Invite a team member" trigger="+ Invite member" action={inviteMember} fields={[{ name: 'email', label: 'Email', type: 'email', required: true }, { name: 'role', label: 'Role', type: 'select', required: true, options: roleOpts }]} values={{ role: 'member' }} submit="Send invitation" note="They get a link that expires in 7 days and only works for this email address." toastMsg="Invitation sent" />} />
      <Card p={0}><TableContainer><Table><Thead><Tr><Th>Member</Th><Th>Role</Th><Th>Status</Th><Th>Joined</Th><Th isNumeric>Projects</Th><Th /></Tr></Thead><Tbody>
        {members.map((m: any) => <Tr key={m.user_id}><Td><Flex align="center" gap={3}><Avatar name={m.name} size="sm" /><div><Text fontWeight={600}>{m.name}</Text><Text fontSize="xs" color="mute">{m.email}</Text></div></Flex></Td>
          <Td>{ctx.isOwner && m.role !== 'owner' ? <RoleSelect userId={m.user_id} role={m.role} action={changeRole} /> : <Status value={m.role} />}</Td><Td><Status value="active" /></Td><Td>{fmtDate(m.joined_at)}</Td><Td isNumeric>{m.projects}</Td>
          <Td>{ctx.isAdmin && m.role !== 'owner' && m.user_id !== ctx.user.id && <FormModal title={`Remove ${m.name}?`} trigger="Remove" variant="ghost" size="xs" action={removeMember} fields={[]} extra={{ userId: m.user_id }} submit="Remove" danger note="They lose access immediately. Their tasks stay in the workspace." toastMsg="Member removed" />}</Td></Tr>)}
        {invites.map((i: any) => <Tr key={i.id}><Td><Flex align="center" gap={3}><Avatar name={i.email} size="sm" /><Text color="mute">{i.email}</Text></Flex></Td><Td><Status value={i.role} /></Td><Td><Status value="pending" /></Td><Td>Expires {fmtDate(i.expires_at)}</Td><Td />
          <Td><Flex gap={1}><ActionForm submit="Resend" action={resendInvite} extra={{ id: i.id }} fields={[]} toastMsg="Invitation re-sent" /><ActionForm submit="Revoke" danger action={revokeInvite} extra={{ id: i.id }} fields={[]} toastMsg="Invitation revoked" /></Flex></Td></Tr>)}
      </Tbody></Table></TableContainer></Card>
    </>
  );
}
