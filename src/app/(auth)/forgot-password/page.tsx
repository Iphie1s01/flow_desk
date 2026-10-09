import { AuthFrame, ForgotForm } from "@/components/auth-forms";
import { TextLink } from "@/components/ui";
export const metadata = { title: "Reset password" };
export default function Page() {
  return (
    <AuthFrame
      title="Forgot your password?"
      sub="We’ll email you a link to choose a new one."
      foot={<TextLink href="/login">Back to log in</TextLink>}
    >
      <ForgotForm />
    </AuthFrame>
  );
}
