import { AuthFrame, ResetForm } from "@/components/auth-forms";
import { TextLink } from "@/components/ui";
import { Text } from "@chakra-ui/react";
export const metadata = { title: "Choose a new password" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <AuthFrame
      title="Choose a new password"
      sub="Pick something you don’t use anywhere else."
      foot={<TextLink href="/login">Back to log in</TextLink>}
    >
      {token && !error ? (
        <ResetForm token={token} />
      ) : (
        <Text>
          This reset link is invalid or has expired.{" "}
          <TextLink href="/forgot-password">Request a new one</TextLink>.
        </Text>
      )}
    </AuthFrame>
  );
}
