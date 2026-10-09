export async function sendMail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      `\n[mail → ${to}] ${subject}\n${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")}\n`,
    );
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "FlowDesk <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) console.error("Mail failed", res.status, await res.text());
}

export const mailLayout = (
  title: string,
  body: string,
  href: string,
  cta: string,
) => `
<div style="font-family:Georgia,serif;max-width:480px;margin:auto;padding:24px;color:#14231c">
  <h2 style="margin:0 0 12px">${title}</h2><p style="font-family:Arial,sans-serif;line-height:1.5">${body}</p>
  <p><a href="${href}" style="background:#e8501a;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;font-family:Arial,sans-serif">${cta}</a></p>
  <p style="font-family:Arial,sans-serif;color:#666;font-size:12px">If the button doesn't work, paste this link into your browser:<br>${href}</p>
</div>`;
