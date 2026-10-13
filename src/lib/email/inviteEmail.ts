/**
 * The Send Invite email.
 *
 * No branded email template existed in this repo before this one (Logto's own
 * auth mails are styled in Logto, not here), so this is the first — kept
 * deliberately plain: one heading, one button, the same three facts the
 * plain-text version carried, and nothing else. It is a transactional email,
 * not a campaign.
 *
 * DELIBERATELY PLAIN, and that is a deliverability decision rather than a
 * taste one. The first version had a brand-coloured header bar, a large
 * filled call-to-action button and a bordered card on a tinted background.
 * Gmail filed it under Promotions, while the earlier plain-text invite to the
 * same mailbox landed in Primary. Those three things are among the strongest
 * signals Gmail's Promotions classifier uses, and an invite nobody sees is
 * worth less than an ugly one they do.
 *
 * So: left-aligned text, one underlined link, no button, no logo, no card, no
 * background colour. It should read like a short note a person sent.
 *
 * HTML-email constraints that drive the remaining markup:
 *   - Tables for width control. Outlook's Word engine has no flexbox or grid.
 *   - Every style inline. Gmail strips <style> blocks in some contexts, and
 *     no external stylesheet is fetched at all.
 *   - No web fonts. They silently fall back, so the stack is system fonts.
 *   - The raw URL is printed as well as linked, because a client that blocks
 *     or rewrites the anchor leaves the reader with nothing otherwise.
 */

const LINK = "#1a56c4"; // a plain link blue: a brand-red CTA reads as marketing
const INK = "#17171b";
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MUTED = "#6e6e7a";

/** Escapes text interpolated into the HTML part. Names come from user profiles. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type InviteEmailInput = {
  /** The inviter's display name, already resolved. Falls back upstream. */
  inviterName: string;
  inviteUrl: string;
  ttlDays: number;
};

export type RenderedEmail = {
  subject: string;
  textBody: string;
  htmlBody: string;
};

const BODY_COPY =
  "Light Rider gives you access to real quantum hardware, quantum randomness, and the tools to build on them.";

const CREDITS_COPY =
  "Simulators are free to use the moment you sign up. Running on real quantum hardware needs credits, which you can buy once you're in.";

export function renderInviteEmail({
  inviterName,
  inviteUrl,
  ttlDays,
}: InviteEmailInput): RenderedEmail {
  const subject = `${inviterName} invited you to join Light Rider`;
  const expiryCopy = `This invitation expires in ${ttlDays} days.`;

  const textBody = [
    subject,
    "",
    BODY_COPY,
    "",
    "Accept your invitation:",
    inviteUrl,
    "",
    CREDITS_COPY,
    "",
    expiryCopy,
  ].join("\n");

  const name = escapeHtml(inviterName);
  const url = escapeHtml(inviteUrl);

  const htmlBody = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background:#ffffff;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(
    BODY_COPY,
  )}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="padding:24px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr>
          <td style="font-family:${FONT}; font-size:16px; line-height:1.55; color:${INK};">
            <p style="margin:0 0 16px;">${name} invited you to join Light Rider.</p>
            <p style="margin:0 0 16px;">${escapeHtml(BODY_COPY)}</p>
            <p style="margin:0 0 16px;">
              <a href="${url}" style="color:${LINK}; text-decoration:underline;">Accept the invitation</a>
            </p>
            <p style="margin:0 0 16px; font-size:14px; color:${MUTED};">
              Or paste this into your browser:<br>
              <span style="word-break:break-all;">${url}</span>
            </p>
            <p style="margin:0 0 16px; font-size:14px; color:${MUTED};">
              ${escapeHtml(CREDITS_COPY)}
            </p>
            <p style="margin:0; font-size:14px; color:${MUTED};">
              ${escapeHtml(expiryCopy)}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { subject, textBody, htmlBody };
}
