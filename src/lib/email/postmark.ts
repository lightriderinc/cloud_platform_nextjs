/**
 * Minimal Postmark client — the app's only outbound-email path.
 *
 * Raw fetch rather than the `postmark` package: sending a message is one POST
 * with one header, and hand-rolled fetch is what every other outbound
 * integration here already does (see lib/logto/management.ts, the iqm-proxy
 * and qpu-proxy calls). Server-only — POSTMARK_SERVER_TOKEN must never reach
 * a client component.
 *
 * Both env vars are set manually in Vercel; neither has a sensible default.
 * POSTMARK_FROM_EMAIL in particular must be a verified Sender Signature (or on
 * a verified domain), otherwise Postmark rejects the send with a 422 — a
 * hardcoded address would fail at send time rather than at configuration time.
 */

const POSTMARK_ENDPOINT = "https://api.postmarkapp.com/email";

/**
 * Whether email can be sent at all. Callers check this BEFORE writing any
 * database rows, so a misconfigured deployment never leaves an invite record
 * behind for a mail that could never go out.
 *
 * Guards against a placeholder value as well as an absent one, the same way
 * isManagementApiConfigured() does: an env file carrying literal "[SENSITIVE]"
 * is a configured-looking value that cannot work.
 */
export function isEmailConfigured(): boolean {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.POSTMARK_FROM_EMAIL;
  return (
    Boolean(token) &&
    token !== "[SENSITIVE]" &&
    Boolean(from) &&
    from !== "[SENSITIVE]" &&
    from!.includes("@")
  );
}

export type SendEmailInput = {
  to: string;
  subject: string;
  /**
   * Always required, even when htmlBody is supplied. Some clients render the
   * text part by preference, some fall back to it when HTML is blocked, and
   * sending HTML alone hurts deliverability — so this is never optional.
   */
  textBody: string;
  /** Optional HTML part. Postmark sends multipart/alternative when both exist. */
  htmlBody?: string;
};

/**
 * Sends one email. Throws on any non-2xx so callers can distinguish "sent"
 * from "not sent" — an invite whose mail silently failed is worse than a
 * visible error, because the recipient is never coming.
 */
export async function sendEmail({
  to,
  subject,
  textBody,
  htmlBody,
}: SendEmailInput): Promise<void> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.POSTMARK_FROM_EMAIL;

  if (!token || !from) {
    throw new Error(
      "POSTMARK_SERVER_TOKEN / POSTMARK_FROM_EMAIL are not configured.",
    );
  }

  const res = await fetch(POSTMARK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: from,
      To: to,
      Subject: subject,
      TextBody: textBody,
      ...(htmlBody ? { HtmlBody: htmlBody } : {}),
      MessageStream: "outbound",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // The endpoint is named because a 422 here is almost always an
    // unverified From address, which is invisible from the response alone.
    throw new Error(
      `Postmark send failed (${res.status}) from=${from}: ${detail}`,
    );
  }
}
