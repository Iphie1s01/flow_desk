import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, Text } from '@/components/ui';
import { Card, EmptyState, ExportButton, PageHeader, RowLink, Status } from '@/components/ui';
import { Filters, FormModal, Pager } from '@/components/forms';
import { getCtx } from '@/lib/session';
import { listCustomers } from '@/lib/queries';
import { saveCustomer } from '@/app/actions';
import { customerFields } from '@/lib/fields';
import { opts, CUSTOMER_STATUS } from '@/lib/constants';
import { formatMoney } from '@/lib/money';
export const metadata = { title: 'Customers' };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams; const ctx = await getCtx(); const d = await listCustomers(ctx, sp);
  const add = ctx.isAdmin && <FormModal title="Add customer" trigger="+ Add customer" action={saveCustomer} fields={customerFields()} values={{ type: 'business', status: 'lead' }} redirect="/customers/{id}" toastMsg="Customer added" defaultOpen={sp.new === '1'} />;
  return (
    <>
      <PageHeader title="Customers" sub={`${d.total} customer${d.total === 1 ? '' : 's'}`} actions={<>{<ExportButton href="/api/export/customers" />}{add}</>} />
      <Filters fields={[{ name: 'q', label: 'Search name, company or email', type: 'search' }, { name: 'status', label: 'All statuses', type: 'select', options: opts(CUSTOMER_STATUS) }, { name: 'sort', label: 'Sort: name', type: 'select', options: [{ value: 'billed', label: 'Sort: total billed' }, { value: 'recent', label: 'Sort: newest' }] }]}
        presets={[{ label: 'Leads needing follow-up', params: { status: 'lead' } }]} />
      <Card p={0} overflow="hidden">
        {d.rows.length ? <TableContainer><Table><Thead><Tr><Th>Customer</Th><Th>Company</Th><Th>Email</Th><Th isNumeric>Projects</Th>{ctx.canFinance && <Th isNumeric>Total billed</Th>}<Th>Status</Th></Tr></Thead><Tbody>
          {d.rows.map((c: any) => <RowLink key={c.id} href={`/customers/${c.id}`}><Td fontWeight={600}>{c.name}</Td><Td>{c.company ?? '—'}</Td><Td color="mute">{c.email ?? '—'}</Td><Td isNumeric>{c.projects}</Td>{ctx.canFinance && <Td isNumeric fontFamily="mono">{formatMoney(c.billed, ctx.ws.currency)}</Td>}<Td><Status value={c.status} /></Td></RowLink>)}</Tbody></Table></TableContainer>
          : <EmptyState title={sp.q || sp.status ? 'No customers match' : 'No customers yet'} text={sp.q || sp.status ? 'Try a different search or filter.' : 'Add your first customer to start managing your business relationships.'} action={add || undefined} />}
      </Card>
      {d.total > 0 && <Pager page={d.page} pages={d.pages} total={d.total} />}
    </>
  );
}
