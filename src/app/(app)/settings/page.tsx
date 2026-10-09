import { Tabs, TabList, Tab, TabPanels, TabPanel, Text, Box } from '@/components/ui';
import { Card, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/forms';
import { SecurityPanel } from '@/components/misc';
import { getCtx } from '@/lib/session';
import { saveNotifyPrefs, saveProfile, saveWorkspace } from '@/app/actions';
import { BUSINESS_TYPES, CURRENCIES } from '@/lib/constants';
export const metadata = { title: 'Settings' };

export default async function Page() {
  const ctx = await getCtx();
  const p = (await ctx.q(async c => (await c.query('select full_name, avatar_url, notify from profiles where user_id = $1', [ctx.user.id])).rows[0])) ?? {};
  const ws = ctx.ws;
  return (
    <>
      <PageHeader title="Settings" sub={`${ctx.user.email} · ${ctx.role}`} />
      <Tabs variant="line" colorScheme="orange" isLazy>
        <TabList><Tab>Profile</Tab><Tab>Workspace</Tab><Tab>Notifications</Tab><Tab>Security</Tab></TabList>
        <TabPanels>
          <TabPanel px={0}><Card title="Your profile"><Box maxW="480px"><ActionForm action={saveProfile} values={{ fullName: p.full_name ?? ctx.user.name, avatarUrl: p.avatar_url ?? '' }} fields={[{ name: 'fullName', label: 'Full name', required: true }, { name: 'avatarUrl', label: 'Profile image URL', type: 'url' }]} /></Box></Card></TabPanel>
          <TabPanel px={0}><Card title="Workspace & invoice defaults">{ctx.isAdmin ? <Box maxW="520px"><ActionForm action={saveWorkspace} values={{ name: ws.name, businessType: ws.business_type ?? '', currency: ws.currency, address: ws.address ?? '', paymentInstructions: ws.payment_instructions ?? '', invoicePrefix: ws.invoice_prefix, defaultTaxBp: ws.default_tax_bp }}
            fields={[{ name: 'name', label: 'Business name', required: true }, { name: 'businessType', label: 'Business type', type: 'select', options: BUSINESS_TYPES.map(b => ({ value: b, label: b })) }, { name: 'currency', label: 'Currency', type: 'select', required: true, options: CURRENCIES.map(b => ({ value: b, label: b })) }, { name: 'address', label: 'Business address', type: 'textarea' }, { name: 'paymentInstructions', label: 'Payment instructions (shown on invoices)', type: 'textarea' }, { name: 'invoicePrefix', label: 'Invoice prefix', hint: 'Capital letters or digits, e.g. INV' }, { name: 'defaultTaxBp', label: 'Default VAT (basis points)', type: 'number', hint: '750 = 7.5%' }]} /></Box> : <Text color="mute">Only admins can change workspace settings.</Text>}</Card></TabPanel>
          <TabPanel px={0}><Card title="Notify me about"><Box maxW="420px"><ActionForm action={saveNotifyPrefs} values={p.notify ?? {}} toastMsg="Preferences saved" fields={[{ name: 'task_assigned', label: 'Tasks and projects assigned to me', type: 'switch' }, { name: 'deadlines', label: 'Approaching and overdue deadlines', type: 'switch' }, { name: 'invoices', label: 'Invoice status changes', type: 'switch' }, { name: 'invites', label: 'Team invitations', type: 'switch' }]} /></Box></Card></TabPanel>
          <TabPanel px={0}><Card title="Password & sessions"><Box maxW="420px"><SecurityPanel /></Box></Card></TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
}
