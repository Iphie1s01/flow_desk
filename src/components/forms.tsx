"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Alert,
  AlertIcon,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  Stack,
  Textarea,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  useToast,
  Flex,
  Text,
  Switch,
  HStack,
  Wrap,
} from "@chakra-ui/react";
import type { Res } from "@/lib/action";

export type Option = { value: string; label: string };
export type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "tel"
    | "number"
    | "date"
    | "textarea"
    | "select"
    | "checks"
    | "switch"
    | "url"
    | "password";
  options?: Option[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  half?: boolean;
};
type Values = Record<string, any>;

export function ActionForm({
  fields,
  values,
  action,
  submit = "Save",
  danger,
  note,
  onDone,
  toastMsg = "Saved",
  redirect,
  extra,
}: {
  fields: Field[];
  values?: Values;
  action: (v: any) => Promise<Res<any>>;
  submit?: string;
  danger?: boolean;
  note?: string;
  onDone?: () => void;
  toastMsg?: string;
  redirect?: string;
  extra?: Values;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState<Values>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        values?.[f.name] ??
          (f.type === "checks"
            ? []
            : f.type === "switch"
              ? false
              : f.type === "select"
                ? (f.options?.[0]?.value ?? "")
                : ""),
      ]),
    ),
  );
  const [err, setErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const set = (k: string, val: any) => {
    setV((p) => ({ ...p, [k]: val }));
    setErr((p) => ({ ...p, [k]: "" }));
  };
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr({});
    const r = await action({ ...extra, ...v });
    if (!r.ok) {
      setErr(r.fields ?? {});
      setMsg(r.error);
      return;
    }
    toast({
      title: toastMsg,
      status: "success",
      duration: 2200,
      position: "bottom",
    });
    onDone?.();
    start(() => {
      if (redirect)
        router.push(redirect.replace("{id}", (r.data as any)?.id ?? ""));
      else router.refresh();
    });
  }
  return (
    <form onSubmit={go} noValidate>
      <Stack spacing={3}>
        {note && (
          <Text color="mute" fontSize="sm">
            {note}
          </Text>
        )}
        {fields.map((f) => (
          <FormControl
            key={f.name}
            isInvalid={!!err[f.name]}
            isRequired={f.required}
          >
            {f.type !== "switch" && <FormLabel>{f.label}</FormLabel>}
            {f.type === "textarea" ? (
              <Textarea
                rows={3}
                value={v[f.name]}
                placeholder={f.placeholder}
                onChange={(e) => set(f.name, e.target.value)}
              />
            ) : f.type === "select" ? (
              <Select
                value={v[f.name]}
                onChange={(e) => set(f.name, e.target.value)}
              >
                {!f.required && <option value="">—</option>}
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : f.type === "checks" ? (
              <CheckboxGroup value={v[f.name]} onChange={(x) => set(f.name, x)}>
                <Wrap spacing={4}>
                  {f.options?.map((o) => (
                    <Checkbox
                      key={o.value}
                      value={o.value}
                      colorScheme="orange"
                    >
                      {o.label}
                    </Checkbox>
                  ))}
                </Wrap>
              </CheckboxGroup>
            ) : f.type === "switch" ? (
              <HStack justify="space-between">
                <FormLabel m={0} fontSize="sm" color="ink">
                  {f.label}
                </FormLabel>
                <Switch
                  isChecked={!!v[f.name]}
                  onChange={(e) => set(f.name, e.target.checked)}
                  colorScheme="orange"
                />
              </HStack>
            ) : (
              <Input
                type={f.type ?? "text"}
                value={v[f.name]}
                placeholder={f.placeholder}
                onChange={(e) => set(f.name, e.target.value)}
                inputMode={f.type === "number" ? "decimal" : undefined}
              />
            )}
            {f.hint && !err[f.name] && (
              <FormHelperText>{f.hint}</FormHelperText>
            )}
            <FormErrorMessage>{err[f.name]}</FormErrorMessage>
          </FormControl>
        ))}
        {msg && !Object.values(err).some(Boolean) && (
          <Alert status="error" borderRadius="4px" fontSize="sm">
            <AlertIcon />
            {msg}
          </Alert>
        )}
        <Flex justify="flex-end">
          <Button
            type="submit"
            variant={danger ? "danger" : "solid"}
            isLoading={pending}
          >
            {submit}
          </Button>
        </Flex>
      </Stack>
    </form>
  );
}

/** Trigger button + modal around ActionForm. Server actions and field specs come from the server page as plain props. */
export function FormModal({
  title,
  trigger,
  variant = "solid",
  size = "md",
  defaultOpen,
  ...rest
}: React.ComponentProps<typeof ActionForm> & {
  title: string;
  trigger: string;
  variant?: string;
  size?: string;
  defaultOpen?: boolean;
}) {
  const d = useDisclosure({ defaultIsOpen: defaultOpen });
  return (
    <>
      <Button variant={variant} size={size} onClick={d.onOpen}>
        {trigger}
      </Button>
      <Modal
        isOpen={d.isOpen}
        onClose={d.onClose}
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent mx={3}>
          <ModalHeader fontFamily="heading" fontWeight={400} fontSize="2xl">
            {title}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={5}>
            <ActionForm
              {...rest}
              danger={rest.danger ?? variant === "danger"}
              onDone={() => {
                rest.onDone?.();
                d.onClose();
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

/** URL-driven filters: shareable, back-button friendly, rendered by the server. */
export function Filters({
  fields,
  presets = [],
}: {
  fields: {
    name: string;
    label: string;
    type: "search" | "select" | "date";
    options?: Option[];
  }[];
  presets?: { label: string; params: Record<string, string> }[];
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const t = useRef<any>(null);
  const [q, setQ] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, sp.get(f.name) ?? ""])),
  );
  useEffect(
    () =>
      setQ(
        Object.fromEntries(fields.map((f) => [f.name, sp.get(f.name) ?? ""])),
      ),
    [sp],
  ); // eslint-disable-line
  const push = (next: Record<string, string>) => {
    const p = new URLSearchParams(sp.toString());
    p.delete("page");
    p.delete("new");
    for (const [k, v] of Object.entries(next)) v ? p.set(k, v) : p.delete(k);
    router.replace(`${path}?${p}`, { scroll: false });
  };
  const active = (pr: Record<string, string>) =>
    Object.entries(pr).every(([k, v]) => sp.get(k) === v);
  return (
    <Flex gap={2} wrap="wrap" mb={4} align="center">
      {fields.map((f) =>
        f.type === "select" ? (
          <Select
            key={f.name}
            w="auto"
            size="sm"
            aria-label={f.label}
            value={q[f.name]}
            onChange={(e) => {
              setQ({ ...q, [f.name]: e.target.value });
              push({ [f.name]: e.target.value });
            }}
          >
            <option value="">{f.label}</option>
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            key={f.name}
            size="sm"
            w={f.type === "date" ? "auto" : undefined}
            flex={f.type === "search" ? "1 1 220px" : undefined}
            type={f.type === "date" ? "date" : "search"}
            aria-label={f.label}
            placeholder={f.label}
            value={q[f.name]}
            onChange={(e) => {
              const val = e.target.value;
              setQ({ ...q, [f.name]: val });
              clearTimeout(t.current);
              t.current = setTimeout(
                () => push({ [f.name]: val }),
                f.type === "date" ? 0 : 300,
              );
            }}
          />
        ),
      )}
      {presets.map((p) => (
        <Button
          key={p.label}
          size="sm"
          variant={active(p.params) ? "outline" : "ghost"}
          bg={active(p.params) ? "ink" : undefined}
          color={active(p.params) ? "bg" : undefined}
          onClick={() =>
            push(
              active(p.params)
                ? Object.fromEntries(Object.keys(p.params).map((k) => [k, ""]))
                : {
                    ...Object.fromEntries(fields.map((f) => [f.name, ""])),
                    ...p.params,
                  },
            )
          }
        >
          {p.label}
        </Button>
      ))}
    </Flex>
  );
}

export function Pager({
  page,
  pages,
  total,
}: {
  page: number;
  pages: number;
  total: number;
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const to = (n: number) => {
    const p = new URLSearchParams(sp.toString());
    p.set("page", String(n));
    router.push(`${path}?${p}`);
  };
  return (
    <Flex
      justify="space-between"
      align="center"
      mt={3}
      fontSize="sm"
      color="mute"
    >
      <Text>
        {total} result{total === 1 ? "" : "s"} · page {page} of {pages}
      </Text>
      <HStack>
        <Button
          size="sm"
          variant="outline"
          isDisabled={page <= 1}
          onClick={() => to(page - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          isDisabled={page >= pages}
          onClick={() => to(page + 1)}
        >
          Next
        </Button>
      </HStack>
    </Flex>
  );
}
