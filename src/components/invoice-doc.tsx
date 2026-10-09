import {
  Box,
  Flex,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
} from "@/components/ui";
import { Status } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { fmtDate } from "@/lib/dates";

/** Printable invoice. Every figure comes from the database view, nothing is recomputed here. */
export function InvoiceDoc({
  inv,
  items,
  ws,
}: {
  inv: any;
  items: any[];
  ws: {
    name: string;
    currency: string;
    address: string | null;
    payment_instructions: string | null;
  };
}) {
  const fmt = (n: number) => formatMoney(n, ws.currency);
  return (
    <Box id="invoice-doc" fontSize="sm">
      <Flex justify="space-between" wrap="wrap" gap={4} mb={6}>
        <Box>
          <Heading size="lg">{ws.name}</Heading>
          <Text color="mute" whiteSpace="pre-line">
            {ws.address ?? ""}
          </Text>
        </Box>
        <Box textAlign="right">
          <Text
            fontFamily="mono"
            fontSize="11px"
            letterSpacing=".1em"
            color="mute"
          >
            INVOICE
          </Text>
          <Text fontFamily="mono" fontWeight={700} fontSize="lg">
            {inv.number}
          </Text>
          <Status value={inv.status} />
        </Box>
      </Flex>
      <Flex justify="space-between" wrap="wrap" gap={4} mb={6}>
        <Box>
          <Text
            fontFamily="mono"
            fontSize="11px"
            color="mute"
            letterSpacing=".08em"
          >
            BILL TO
          </Text>
          <Text fontWeight={700}>{inv.customer_name}</Text>
          <Text color="mute">{inv.customer_company}</Text>
          <Text color="mute">{inv.customer_email}</Text>
        </Box>
        <Box textAlign="right">
          <Text>Issued {fmtDate(inv.issue_date)}</Text>
          <Text>Due {fmtDate(inv.due_date)}</Text>
        </Box>
      </Flex>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Description</Th>
            <Th isNumeric>Qty</Th>
            <Th isNumeric>Unit price</Th>
            <Th isNumeric>Total</Th>
          </Tr>
        </Thead>
        <Tbody>
          {items.map((x: any) => (
            <Tr key={x.id}>
              <Td>{x.description}</Td>
              <Td isNumeric>{x.quantity}</Td>
              <Td isNumeric fontFamily="mono">
                {fmt(x.unit_price_minor)}
              </Td>
              <Td isNumeric fontFamily="mono">
                {fmt(x.quantity * x.unit_price_minor)}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      <Flex justify="flex-end" mt={4}>
        <Box minW="260px">
          {[
            ["Subtotal", inv.subtotal_minor],
            ...(inv.discount_minor ? [["Discount", -inv.discount_minor]] : []),
            ...(inv.tax_bp
              ? [[`VAT ${inv.tax_bp / 100}%`, inv.tax_minor]]
              : []),
          ].map(([l, v]) => (
            <Flex key={String(l)} justify="space-between" py={1}>
              <Text color="mute">{l}</Text>
              <Text fontFamily="mono">{fmt(Number(v))}</Text>
            </Flex>
          ))}
          <Flex
            justify="space-between"
            py={2}
            borderTop="2px solid"
            borderColor="ink"
          >
            <Text fontWeight={700}>Total</Text>
            <Text fontFamily="mono" fontWeight={700}>
              {fmt(inv.total_minor)}
            </Text>
          </Flex>
          <Flex justify="space-between" py={1}>
            <Text color="mute">Paid</Text>
            <Text fontFamily="mono">{fmt(inv.paid_minor)}</Text>
          </Flex>
          <Flex justify="space-between" py={1}>
            <Text fontWeight={700}>Balance due</Text>
            <Text fontFamily="heading" fontSize="2xl" lineHeight="1">
              {inv.status === "void" ? "—" : fmt(inv.balance_minor)}
            </Text>
          </Flex>
        </Box>
      </Flex>
      {(inv.notes || inv.terms || ws.payment_instructions) && (
        <Box mt={6} pt={4} borderTop="1px solid" borderColor="line">
          {ws.payment_instructions && (
            <>
              <Text
                fontFamily="mono"
                fontSize="11px"
                color="mute"
                letterSpacing=".08em"
              >
                PAYMENT INSTRUCTIONS
              </Text>
              <Text mb={3}>{ws.payment_instructions}</Text>
            </>
          )}
          {inv.notes && (
            <>
              <Text
                fontFamily="mono"
                fontSize="11px"
                color="mute"
                letterSpacing=".08em"
              >
                NOTES
              </Text>
              <Text mb={3} whiteSpace="pre-wrap">
                {inv.notes}
              </Text>
            </>
          )}
          {inv.terms && (
            <>
              <Text
                fontFamily="mono"
                fontSize="11px"
                color="mute"
                letterSpacing=".08em"
              >
                TERMS
              </Text>
              <Text whiteSpace="pre-wrap">{inv.terms}</Text>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
