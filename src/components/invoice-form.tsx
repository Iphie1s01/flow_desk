"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import { Plus, Trash2 } from "lucide-react";
import { saveInvoice } from "@/app/actions";
import { formatMoney, invoiceTotals, parseMoney } from "@/lib/money";
import type { Option } from "./forms";

type Line = { description: string; quantity: string; unit: string };
export type InvoiceInit = {
  id?: string;
  customerId?: string;
  projectId?: string;
  issueDate: string;
  dueDate: string;
  discount: string;
  taxPct: string;
  notes: string;
  terms: string;
  items: Line[];
};

export function InvoiceForm({
  init,
  customers,
  projects,
  currency,
}: {
  init: InvoiceInit;
  customers: Option[];
  projects: Option[];
  currency: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState(init);
  const [err, setErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof InvoiceInit, v: any) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: "" }));
  };
  const setLine = (i: number, k: keyof Line, v: string) =>
    setF((p) => ({
      ...p,
      items: p.items.map((l, n) => (n === i ? { ...l, [k]: v } : l)),
    }));
  const taxBp = Math.round(Number(f.taxPct || 0) * 100);
  const priced = f.items
    .map((l) => ({
      quantity: Math.max(0, Math.floor(Number(l.quantity) || 0)),
      unit: parseMoney(l.unit || "0"),
    }))
    .map((l) => ({ ...l, unit: Number.isNaN(l.unit) ? 0 : l.unit }));
  const disc = parseMoney(f.discount || "0");
  const t = invoiceTotals(
    priced,
    Number.isNaN(disc) ? 0 : disc,
    Number.isFinite(taxBp) ? taxBp : 0,
  );
  async function submit() {
    setBusy(true);
    setErr({});
    setMsg("");
    const items = f.items
      .filter((l) => l.description.trim() || l.unit.trim())
      .map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit,
      }));
    const r = await saveInvoice({
      id: f.id,
      customerId: f.customerId,
      projectId: f.projectId ?? "",
      issueDate: f.issueDate,
      dueDate: f.dueDate,
      discount: f.discount,
      taxBp,
      notes: f.notes,
      terms: f.terms,
      items,
    });
    setBusy(false);
    if (!r.ok) {
      setErr(r.fields ?? {});
      setMsg(r.error);
      return;
    }
    toast({
      title: "Invoice saved as draft",
      status: "success",
      duration: 2200,
    });
    router.push(`/invoices/${r.data.id}`);
    router.refresh();
  }
  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
        <FormControl isInvalid={!!err.customerId} isRequired>
          <FormLabel>Customer</FormLabel>
          <Select
            placeholder="Choose a customer"
            value={f.customerId ?? ""}
            onChange={(e) => set("customerId", e.target.value)}
          >
            {customers.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <FormErrorMessage>{err.customerId}</FormErrorMessage>
        </FormControl>
        <FormControl>
          <FormLabel>Project (optional)</FormLabel>
          <Select
            placeholder="None"
            value={f.projectId ?? ""}
            onChange={(e) => set("projectId", e.target.value)}
          >
            {projects.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl isInvalid={!!err.issueDate}>
          <FormLabel>Issue date</FormLabel>
          <Input
            type="date"
            value={f.issueDate}
            onChange={(e) => set("issueDate", e.target.value)}
          />
          <FormErrorMessage>{err.issueDate}</FormErrorMessage>
        </FormControl>
        <FormControl isInvalid={!!err.dueDate}>
          <FormLabel>Due date</FormLabel>
          <Input
            type="date"
            value={f.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
          />
          <FormErrorMessage>{err.dueDate}</FormErrorMessage>
        </FormControl>
      </SimpleGrid>
      <Box
        bg="surface"
        border="1px solid"
        borderColor="line"
        borderRadius="6px"
        p={4}
        mb={4}
      >
        <Flex
          gap={2}
          mb={2}
          display={{ base: "none", md: "flex" }}
          fontFamily="mono"
          fontSize="10px"
          color="mute"
          letterSpacing=".08em"
        >
          <Text flex={3}>DESCRIPTION</Text>
          <Text w="80px">QTY</Text>
          <Text flex={1}>UNIT PRICE</Text>
          <Text w="120px" textAlign="right">
            TOTAL
          </Text>
          <Box w="32px" />
        </Flex>
        {f.items.map((l, i) => (
          <Flex
            key={i}
            gap={2}
            mb={2}
            wrap={{ base: "wrap", md: "nowrap" }}
            align="center"
          >
            <Input
              flex={{ base: "1 1 100%", md: 3 }}
              aria-label="Description"
              placeholder="e.g. Website design"
              value={l.description}
              onChange={(e) => setLine(i, "description", e.target.value)}
            />
            <Input
              w="80px"
              aria-label="Quantity"
              inputMode="numeric"
              value={l.quantity}
              onChange={(e) => setLine(i, "quantity", e.target.value)}
            />
            <Input
              flex={1}
              aria-label="Unit price"
              inputMode="decimal"
              placeholder="0.00"
              value={l.unit}
              onChange={(e) => setLine(i, "unit", e.target.value)}
            />
            <Text w="120px" textAlign="right" fontFamily="mono" fontSize="13px">
              {formatMoney(priced[i].quantity * priced[i].unit, currency)}
            </Text>
            <IconButton
              aria-label="Remove line"
              size="sm"
              variant="ghost"
              icon={<Trash2 size={14} />}
              isDisabled={f.items.length === 1}
              onClick={() =>
                setF((p) => ({
                  ...p,
                  items: p.items.filter((_, n) => n !== i),
                }))
              }
            />
          </Flex>
        ))}
        {err.items && (
          <Text color="danger" fontSize="sm" mb={2}>
            {err.items}
          </Text>
        )}
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Plus size={14} />}
          onClick={() =>
            setF((p) => ({
              ...p,
              items: [...p.items, { description: "", quantity: "1", unit: "" }],
            }))
          }
        >
          Add line
        </Button>
      </Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Box>
          <FormControl mb={3}>
            <FormLabel>Notes</FormLabel>
            <Textarea
              rows={2}
              value={f.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Payment terms</FormLabel>
            <Textarea
              rows={2}
              value={f.terms}
              onChange={(e) => set("terms", e.target.value)}
            />
          </FormControl>
        </Box>
        <Box>
          <SimpleGrid columns={2} spacing={3} mb={3}>
            <FormControl isInvalid={!!err.discount}>
              <FormLabel>Discount</FormLabel>
              <Input
                inputMode="decimal"
                value={f.discount}
                onChange={(e) => set("discount", e.target.value)}
              />
              <FormErrorMessage>{err.discount}</FormErrorMessage>
            </FormControl>
            <FormControl>
              <FormLabel>VAT %</FormLabel>
              <Input
                inputMode="decimal"
                value={f.taxPct}
                onChange={(e) => set("taxPct", e.target.value)}
              />
            </FormControl>
          </SimpleGrid>
          {[
            ["Subtotal", t.subtotal],
            ["Discount", -(Number.isNaN(disc) ? 0 : disc)],
            [`VAT ${f.taxPct || 0}%`, t.tax],
          ].map(([l, v]) => (
            <Flex
              key={String(l)}
              justify="space-between"
              fontSize="sm"
              color="mute"
            >
              <Text>{l}</Text>
              <Text fontFamily="mono">{formatMoney(Number(v), currency)}</Text>
            </Flex>
          ))}
          <Flex
            justify="space-between"
            mt={1}
            pt={2}
            borderTop="2px solid"
            borderColor="ink"
          >
            <Text fontWeight={700}>Total</Text>
            <Text fontFamily="heading" fontSize="2xl" lineHeight="1">
              {formatMoney(t.total, currency)}
            </Text>
          </Flex>
        </Box>
      </SimpleGrid>
      {msg && !Object.values(err).some(Boolean) && (
        <Alert status="error" mt={4} borderRadius="4px">
          <AlertIcon />
          {msg}
        </Alert>
      )}
      <Flex justify="flex-end" gap={2} mt={5}>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={submit} isLoading={busy}>
          {f.id ? "Save draft" : "Create draft"}
        </Button>
      </Flex>
    </Box>
  );
}
