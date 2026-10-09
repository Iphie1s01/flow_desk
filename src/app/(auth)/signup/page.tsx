import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { googleEnabled } from "@/lib/auth";
import { AuthFrame, SignupForm } from "@/components/auth-forms";
import { TextLink } from "@/components/ui";
export const metadata = { title: "Sign up" };
export default async function Page() {
  if (await getSession()) redirect("/overview");
  return (
    <AuthFrame
      title="Create your workspace"
      sub="Free while you build. No card needed."
      foot={
        <>
          Already have an account? <TextLink href="/login">Log in</TextLink>
        </>
      }
    >
      <SignupForm google={googleEnabled} />
    </AuthFrame>
  );
}
