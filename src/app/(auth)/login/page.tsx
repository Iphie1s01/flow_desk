import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { googleEnabled } from "@/lib/auth";
import { AuthFrame, LoginForm } from "@/components/auth-forms";
import { TextLink } from "@/components/ui";
export const metadata = { title: "Log in" };
export default async function Page() {
  if (await getSession()) redirect("/overview");
  return (
    <AuthFrame
      title="Welcome back"
      sub="Your business. In sync."
      foot={
        <>
          New here? <TextLink href="/signup">Create an account</TextLink>
        </>
      }
    >
      <LoginForm google={googleEnabled} demo={!!process.env.DEMO_EMAIL} />
    </AuthFrame>
  );
}
