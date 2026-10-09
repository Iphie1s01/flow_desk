"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Box,
  Flex,
  Heading,
  Select,
  Text,
  useToast,
  Checkbox,
} from "@chakra-ui/react";
import type { Res } from "@/lib/action";
import type { Option } from "./forms";

export type KCard = {
  id: string;
  col: string;
  title: string;
  sub?: string;
  meta?: string;
  href?: string;
  footer?: React.ReactNode;
};
type Move = (id: string, col: string) => Promise<Res<any>>;

function useMover(move: Move) {
  const router = useRouter();
  const toast = useToast();
  return async (id: string, col: string, onFail: () => void) => {
    const r = await move(id, col);
    if (!r.ok) {
      onFail();
      toast({
        title: r.error,
        status: "error",
        duration: 3500,
        position: "bottom",
      });
    } else router.refresh();
  };
}

/** Drag-and-drop board. Every card also has a plain <select>, so dragging is never the only way to change status. */
export function Kanban({
  columns,
  cards,
  move,
}: {
  columns: Option[];
  cards: KCard[];
  move: Move;
}) {
  const [items, setItems] = useState(cards);
  useEffect(() => setItems(cards), [cards]);
  const mover = useMover(move);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const change = (id: string, col: string) => {
    const prev = items;
    setItems((p) => p.map((i) => (i.id === id ? { ...i, col } : i)));
    void mover(id, col, () => setItems(prev));
  };
  const end = (e: DragEndEvent) => {
    const id = String(e.active.id),
      col = e.over ? String(e.over.id) : "";
    const c = items.find((i) => i.id === id);
    if (c && col && c.col !== col) change(id, col);
  };
  return (
    <DndContext sensors={sensors} onDragEnd={end}>
      <Flex gap={3} overflowX="auto" pb={2} align="flex-start">
        {columns.map((col) => (
          <Column
            key={col.value}
            col={col}
            count={items.filter((i) => i.col === col.value).length}
          >
            {items
              .filter((i) => i.col === col.value)
              .map((c) => (
                <CardView
                  key={c.id}
                  c={c}
                  columns={columns}
                  onChange={(v) => change(c.id, v)}
                />
              ))}
          </Column>
        ))}
      </Flex>
    </DndContext>
  );
}
function Column({
  col,
  count,
  children,
}: {
  col: Option;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.value });
  return (
    <Box
      ref={setNodeRef}
      minW="240px"
      flex="1 0 240px"
      bg={isOver ? "rule" : "bg"}
      border="1px dashed"
      borderColor={isOver ? "accent" : "line"}
      borderRadius="6px"
      p={2.5}
      minH="140px"
      transition="all .15s"
    >
      <Text
        fontFamily="mono"
        fontSize="11px"
        letterSpacing=".08em"
        textTransform="uppercase"
        fontWeight={700}
        color="mute"
        mb={2}
      >
        {col.label} · {count}
      </Text>
      {children}
    </Box>
  );
}
function CardView({
  c,
  columns,
  onChange,
}: {
  c: KCard;
  columns: Option[];
  onChange: (v: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: c.id });
  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      bg="surface"
      border="1px solid"
      borderColor="line"
      borderRadius="5px"
      p={3}
      mb={2}
      cursor="grab"
      opacity={isDragging ? 0.6 : 1}
      boxShadow={isDragging ? "lg" : undefined}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px,${transform.y}px,0)`
          : undefined,
      }}
      transition={isDragging ? undefined : "box-shadow .15s"}
      _hover={{ boxShadow: "sm" }}
    >
      {c.href ? (
        <Text
          as={NextLink}
          href={c.href}
          fontWeight={700}
          fontSize="sm"
          onPointerDown={(e: any) => e.stopPropagation()}
        >
          {c.title}
        </Text>
      ) : (
        <Text fontWeight={700} fontSize="sm">
          {c.title}
        </Text>
      )}
      {c.sub && (
        <Text color="mute" fontSize="xs">
          {c.sub}
        </Text>
      )}
      {c.meta && (
        <Text fontFamily="mono" fontSize="11px" mt={1}>
          {c.meta}
        </Text>
      )}
      {c.footer && <Box mt={2}>{c.footer}</Box>}
      <Select
        size="xs"
        mt={2}
        value={c.col}
        aria-label="Change status"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => onChange(e.target.value)}
      >
        {columns.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Box>
  );
}

export function StatusSelect({
  id,
  value,
  options,
  action,
  width = "130px",
}: {
  id: string;
  value: string;
  options: Option[];
  action: Move;
  width?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const mover = useMover(action);
  return (
    <Select
      size="xs"
      w={width}
      value={v}
      aria-label="Status"
      onChange={(e) => {
        const prev = v;
        setV(e.target.value);
        void mover(id, e.target.value, () => setV(prev));
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
export function DoneCheck({
  id,
  done,
  action,
}: {
  id: string;
  done: boolean;
  action: Move;
}) {
  const [v, setV] = useState(done);
  useEffect(() => setV(done), [done]);
  const mover = useMover(action);
  return (
    <Checkbox
      isChecked={v}
      colorScheme="green"
      aria-label="Mark complete"
      onChange={(e) => {
        const n = e.target.checked;
        setV(n);
        void mover(id, n ? "done" : "todo", () => setV(!n));
      }}
    />
  );
}
