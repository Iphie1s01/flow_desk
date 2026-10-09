import { Text } from "@chakra-ui/react";
import { requireUser } from "@/lib/session";
import { previewInvite } from "@/app/actions";
import { AuthFrame } from "@/components/auth-forms";
import { AcceptInvite } from "@/components/accept-invite";
export const metadata = { title: "Join workspace" };
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await requireUser();
  const inv = await previewInvite(token);
  if (!inv)
    return (
      <AuthFrame
        title="Invitation unavailable"
        sub="It may have expired, been revoked, or already been used."
      >
        <Text>Ask the workspace owner to send a new invitation.</Text>
      </AuthFrame>
    );
  if (inv.email !== user.email.toLowerCase())
    return (
      <AuthFrame
        title="Wrong account"
        sub={`This invitation was sent to ${inv.email}.`}
      >
        <Text>
          You’re signed in as {user.email}. Sign out and log in with the invited
          address.
        </Text>
      </AuthFrame>
    );
  return (
    <AuthFrame
      title={`Join ${inv.workspace_name}`}
      sub={`You’ve been invited as ${inv.role}.`}
    >
      <AcceptInvite token={token} />
    </AuthFrame>
  );
}
