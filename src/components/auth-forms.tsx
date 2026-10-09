"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Button, Divider, Flex, Heading, Text } from "@chakra-ui/react";
import { Waves } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ActionForm, type Field } from "./forms";
import { TextLink } from "./ui";
import { demoLogin } from "@/app/actions";

const ok = { ok: true as const, data: null };
const bad = (error: string, fields?: Record<string, string>) => ({
  ok: false as const,
  error,
  fields,
});
const safeNext = (n: string | null) =>
  n && n.startsWith("/") && !n.startsWith("//") ? n : "/overview";

export function AuthFrame({
  title,
  sub,
  children,
  foot,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <Flex minH="100vh" align="center" justify="center" p={4}>
      <Box w="full" maxW="400px">
        <Flex
          align="center"
          gap={2}
          fontFamily="heading"
          fontSize="30px"
          color="accent"
          mb={5}
        >
          <Waves />
          FlowDesk
        </Flex>
        <Heading size="xl" mb={1}>
          {title}
        </Heading>
        <Text color="mute" mb={5}>
          {sub}
        </Text>
        <Box
          bg="surface"
          border="1px solid"
          borderColor="line"
          borderRadius="6px"
          p={5}
        >
          {children}
        </Box>
        {foot && (
          <Text mt={4} fontSize="sm" color="mute" textAlign="center">
            {foot}
          </Text>
        )}
      </Box>
    </Flex>
  );
}
const Google = ({ next, enabled }: { next: string; enabled: boolean }) =>
  enabled ? (
    <>
      <Divider my={4} />
      <Button
        w="full"
        variant="outline"
        onClick={() =>
          authClient.signIn.social({
            provider: "google",
            callbackURL: next,
            newUserCallbackURL: "/onboarding",
          })
        }
      >
        Continue with Google
      </Button>
    </>
  ) : null;

export function LoginForm({
  google,
  demo,
}: {
  google: boolean;
  demo: boolean;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const next = safeNext(sp.get("next"));
  const [unverified, setUnverified] = useState("");
  const fields: Field[] = [
    { name: "email", label: "Email", type: "email", required: true },
    { name: "password", label: "Password", type: "password", required: true },
  ];
  const login = async (v: any) => {
    const r = await authClient.signIn.email({
      email: v.email,
      password: v.password,
    });
    if (r.error) {
      if (r.error.status === 403) {
        setUnverified(v.email);
        return bad(
          "Please verify your email first. We can send the link again below.",
        );
      }
      return bad("Wrong email or password.");
    }
    window.location.href = next;
    return ok;
  };
  return (
    <>
      <ActionForm
        fields={fields}
        action={login}
        submit="Log in"
        toastMsg="Welcome back"
      />
      {unverified && (
        <Button
          mt={3}
          size="sm"
          variant="outline"
          onClick={async () => {
            await authClient.sendVerificationEmail({
              email: unverified,
              callbackURL: "/onboarding",
            });
            router.push("/verify?email=" + encodeURIComponent(unverified));
          }}
        >
          Resend verification email
        </Button>
      )}
      <Flex justify="space-between" mt={3} fontSize="sm">
        <TextLink href="/forgot-password">Forgot password?</TextLink>
      </Flex>
      <Google next={next} enabled={google} />
      {demo && (
        <Button
          mt={3}
          w="full"
          variant="ghost"
          onClick={async () => {
            const r = await demoLogin();
            if (r.ok) window.location.href = "/overview";
          }}
        >
          Explore the read-only demo
        </Button>
      )}
    </>
  );
}
export function SignupForm({ google }: { google: boolean }) {
  const router = useRouter();
  const fields: Field[] = [
    { name: "name", label: "Full name", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    {
      name: "password",
      label: "Password",
      type: "password",
      required: true,
      hint: "At least 8 characters.",
    },
    {
      name: "confirm",
      label: "Confirm password",
      type: "password",
      required: true,
    },
  ];
  const signup = async (v: any) => {
    if (v.password !== v.confirm)
      return bad("Passwords do not match.", {
        confirm: "Passwords do not match.",
      });
    const r = await authClient.signUp.email({
      name: v.name,
      email: v.email,
      password: v.password,
      callbackURL: "/onboarding",
    });
    if (r.error)
      return bad(
        r.error.message ?? "Could not create the account.",
        r.error.message?.toLowerCase().includes("password")
          ? { password: r.error.message }
          : r.error.message?.toLowerCase().includes("exist")
            ? { email: "An account with this email already exists." }
            : undefined,
      );
    router.push("/verify?email=" + encodeURIComponent(v.email));
    return ok;
  };
  return (
    <>
      <ActionForm
        fields={fields}
        action={signup}
        submit="Create account"
        toastMsg="Account created"
      />
      <Google next="/onboarding" enabled={google} />
    </>
  );
}
export function ForgotForm() {
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <Text>
        If an account exists for that address, a reset link is on its way. It
        expires in one hour.
      </Text>
    );
  return (
    <ActionForm
      fields={[
        { name: "email", label: "Email", type: "email", required: true },
      ]}
      submit="Send reset link"
      toastMsg="Check your inbox"
      action={async (v) => {
        await authClient.requestPasswordReset({
          email: v.email,
          redirectTo: "/reset-password",
        });
        setSent(true);
        return ok;
      }}
    />
  );
}
export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  return (
    <ActionForm
      submit="Set new password"
      toastMsg="Password updated"
      fields={[
        {
          name: "password",
          label: "New password",
          type: "password",
          required: true,
          hint: "At least 8 characters.",
        },
      ]}
      action={async (v) => {
        const r = await authClient.resetPassword({
          newPassword: v.password,
          token,
        });
        if (r.error)
          return bad(
            r.error.message ?? "This link is invalid or has expired.",
            { password: r.error.message ?? "" },
          );
        router.push("/login");
        return ok;
      }}
    />
  );
}
export function ResendVerification({ email }: { email: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      isDisabled={done || !email}
      onClick={async () => {
        await authClient.sendVerificationEmail({
          email,
          callbackURL: "/onboarding",
        });
        setDone(true);
      }}
    >
      {done ? "Sent again" : "Resend email"}
    </Button>
  );
}
