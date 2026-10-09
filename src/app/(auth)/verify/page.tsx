import { AuthFrame, ResendVerification } from "@/components/auth-forms";
import { TextLink } from "@/components/ui";
import { Text } from "@chakra-ui/react";
export const metadata = { title: "Verify your email" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return (
    <AuthFrame
      title="Check your inbox"
      sub="One last step before you start."
      foot={<TextLink href="/login">Back to log in</TextLink>}
    >
      <Text mb={4}>
        We sent a verification link
        {email ? (
          <>
            {" "}
            to <b>{email}</b>
          </>
        ) : (
          ""
        )}
        . Open it and you’ll be signed in automatically. The link expires after
        a while, so resend it if needed.
      </Text>
      <ResendVerification email={email} />
    </AuthFrame>
  );
}
