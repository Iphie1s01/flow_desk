"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Select,
  Text,
  useToast,
} from "@chakra-ui/react";
import { Download, Paperclip, Printer, Trash2 } from "lucide-react";
import type { Res } from "@/lib/action";
import { ActionForm } from "./forms";
import { authClient } from "@/lib/auth-client";
import { FILE_TYPES, MAX_FILE_BYTES } from "@/lib/constants";

export const PrintButton = () => (
  <Button
    variant="outline"
    leftIcon={<Printer size={14} />}
    onClick={() => window.print()}
  >
    Print / Save as PDF
  </Button>
);
export const AutoPrint = () => {
  if (typeof window !== "undefined") setTimeout(() => window.print(), 400);
  return null;
};

export function RoleSelect({
  userId,
  role,
  action,
}: {
  userId: string;
  role: string;
  action: (id: string, role: string) => Promise<Res<any>>;
}) {
  const router = useRouter();
  const toast = useToast();
  return (
    <Select
      size="xs"
      w="110px"
      value={role}
      aria-label="Role"
      onChange={async (e) => {
        const r = await action(userId, e.target.value);
        if (!r.ok) toast({ title: r.error, status: "error" });
        router.refresh();
      }}
    >
      <option value="admin">Admin</option>
      <option value="member">Member</option>
      <option value="viewer">Viewer</option>
    </Select>
  );
}

export function FilesPanel({
  projectId,
  files,
  enabled,
  canUpload,
  canDeleteAll,
  me,
}: {
  projectId: string;
  files: {
    id: string;
    file_name: string;
    size_bytes: number;
    uploaded_by: string;
  }[];
  enabled: boolean;
  canUpload: boolean;
  canDeleteAll: boolean;
  me: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    if (!FILE_TYPES[file.type])
      return toast({
        title: "This file type is not allowed.",
        description: "PDF, images, Office documents, CSV, TXT or ZIP.",
        status: "error",
      });
    if (file.size > MAX_FILE_BYTES)
      return toast({
        title: "Files must be 10 MB or smaller.",
        status: "error",
      });
    setBusy(true);
    try {
      const a = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });
      const j = await a.json();
      if (!a.ok) throw new Error(j.error);
      const put = await fetch(j.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Upload to storage failed.");
      const done = await fetch(`/api/files/${j.id}`, { method: "PATCH" });
      if (!done.ok) throw new Error((await done.json()).error);
      toast({ title: "File uploaded", status: "success", duration: 2000 });
      router.refresh();
    } catch (e: any) {
      toast({ title: e.message ?? "Upload failed", status: "error" });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <Box>
      {!enabled && (
        <Alert status="info" borderRadius="4px" mb={3} fontSize="sm">
          <AlertIcon />
          File storage isn’t configured. Add the R2_* variables to enable
          private uploads.
        </Alert>
      )}
      {canUpload && enabled && (
        <>
          <input
            ref={input}
            type="file"
            hidden
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button
            size="sm"
            leftIcon={<Paperclip size={14} />}
            isLoading={busy}
            onClick={() => input.current?.click()}
            mb={3}
          >
            Upload file
          </Button>
        </>
      )}
      {files.length === 0 && <Text color="mute">No files yet.</Text>}
      {files.map((f) => (
        <Flex
          key={f.id}
          justify="space-between"
          align="center"
          py={2}
          borderBottom="1px solid"
          borderColor="line"
        >
          <Box>
            <Text fontWeight={600}>{f.file_name}</Text>
            <Text fontSize="xs" color="mute">
              {(f.size_bytes / 1024).toFixed(0)} KB
            </Text>
          </Box>
          <HStack>
            <IconButton
              as="a"
              href={`/api/files/${f.id}`}
              aria-label="Download"
              size="sm"
              variant="ghost"
              icon={<Download size={14} />}
            />
            {(canDeleteAll || f.uploaded_by === me) && (
              <IconButton
                aria-label="Delete file"
                size="sm"
                variant="ghost"
                icon={<Trash2 size={14} />}
                onClick={async () => {
                  await fetch(`/api/files/${f.id}`, { method: "DELETE" });
                  router.refresh();
                }}
              />
            )}
          </HStack>
        </Flex>
      ))}
    </Box>
  );
}

export function SecurityPanel() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const submit = async (v: any) => {
    const r = await authClient.changePassword({
      currentPassword: v.current,
      newPassword: v.next,
      revokeOtherSessions: true,
    });
    return r.error
      ? {
          ok: false as const,
          error: r.error.message ?? "Could not change password",
          fields: { current: r.error.message ?? "" },
        }
      : { ok: true as const, data: null };
  };
  return (
    <Box>
      <ActionForm
        submit="Change password"
        toastMsg="Password changed. Other devices were signed out."
        action={submit}
        fields={[
          {
            name: "current",
            label: "Current password",
            type: "password",
            required: true,
          },
          {
            name: "next",
            label: "New password (8+ characters)",
            type: "password",
            required: true,
          },
        ]}
      />
      <Button
        mt={5}
        variant="outline"
        isLoading={busy}
        onClick={async () => {
          setBusy(true);
          await authClient.revokeOtherSessions();
          setBusy(false);
          toast({
            title: "Signed out of all other devices",
            status: "success",
          });
        }}
      >
        Sign out other devices
      </Button>
    </Box>
  );
}
