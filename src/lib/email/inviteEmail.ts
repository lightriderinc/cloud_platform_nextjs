/**
 * The Send Invite email.
 *
 * No branded email template existed in this repo before this one (Logto's own
 * auth mails are styled in Logto, not here), so this is the first — kept
 * deliberately plain: one heading, one button, the same three facts the
 * plain-text version carried, and nothing else. It is a transactional email,
 * not a campaign.
 *
 * HTML-email constraints that drive the odd-looking markup below:
 *   - Tables for layout. Outlook's Word rendering engine has no flexbox or
 *     grid, and float support is unreliable.
 *   - Every style inline. Gmail strips <style> blocks in some contexts, and
 *     no external stylesheet is fetched at all.
 *   - No web fonts. They silently fall back, so the stack is system fonts.
 *   - The button's padding sits on the table cell, not on the <a>. Outlook's
 *     Word engine drops padding on inline-block anchors, which would leave a
 *     bare red-on-red link; padding the cell degrades to a padded red block.
 *   - The raw URL is printed under the button as well, because a client that
 *     blocks or mangles the link leaves the reader with nothing otherwise.
 */

const BRAND = "#ef3b39"; // --brand-primary, src/app/styles/variables.css
const INK = "#17171b";
const MUTED = "#6e6e7a";
const LINE = "#e3e3e7";
const GROUND = "#f6f6f7";

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
<body style="margin:0; padding:0; background:${GROUND}; -webkit-font-smoothing:antialiased;">
<!-- Preheader: the grey line clients show next to the subject in the inbox. -->
<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(
    BODY_COPY,
  )}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GROUND};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; background:#ffffff; border:1px solid ${LINE}; border-radius:4px;">
        <tr>
          <td style="padding:32px 32px 0 32px;">
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:${BRAND}; font-weight:600;">
              Light Rider
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0 32px;">
            <h1 style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:24px; line-height:1.25; font-weight:600; color:${INK};">
              ${name} invited you to join Light Rider
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0 32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:${INK};">
            ${escapeHtml(BODY_COPY)}
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="${BRAND}" style="border-radius:4px; padding:13px 28px;">
                  <a href="${url}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; line-height:1;">
                    Accept invitation
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 32px 0 32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:${MUTED};">
            Or paste this link into your browser:<br>
            <a href="${url}" style="color:${MUTED}; word-break:break-all;">${url}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0 32px;">
            <div style="border-top:1px solid ${LINE}; height:1px; line-height:1px; font-size:0;">&nbsp;</div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 32px 32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; line-height:1.6; color:${MUTED};">
            ${escapeHtml(CREDITS_COPY)}
            <br><br>
            ${escapeHtml(expiryCopy)}
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
