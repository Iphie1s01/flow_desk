"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertIcon, Button } from "@chakra-ui/react";
import { acceptInvite } from "@/app/actions";
export function AcceptInvite({ token }: { token: string }) {
  const r = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      {msg && (
        <Alert status="error" mb={3} borderRadius="4px">
          <AlertIcon />
          {msg}
        </Alert>
      )}
      <Button
        w="full"
        isLoading={busy}
        onClick={async () => {
          setBusy(true);
          const x = await acceptInvite(token);
          setBusy(false);
          if (!x.ok) setMsg(x.error);
          else {
            r.push("/overview");
            r.refresh();
          }
        }}
      >
        Accept invitation
      </Button>
    </>
  );
}
