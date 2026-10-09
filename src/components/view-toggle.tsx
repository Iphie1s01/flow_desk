"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button, ButtonGroup } from "@chakra-ui/react";
export function ViewToggle({ value }: { value: "list" | "board" }) {
  const r = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const set = (v: string) => {
    const p = new URLSearchParams(sp.toString());
    p.set("view", v);
    r.replace(`${path}?${p}`, { scroll: false });
  }; // filters and search are kept
  return (
    <ButtonGroup size="sm" isAttached variant="outline">
      <Button
        bg={value === "list" ? "ink" : undefined}
        color={value === "list" ? "bg" : undefined}
        onClick={() => set("list")}
      >
        List
      </Button>
      <Button
        bg={value === "board" ? "ink" : undefined}
        color={value === "board" ? "bg" : undefined}
        onClick={() => set("board")}
      >
        Board
      </Button>
    </ButtonGroup>
  );
}
