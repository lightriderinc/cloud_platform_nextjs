import type { PendingEmail } from "./notifications";

// Legal-update notification emails, sent via Postmark's HTTP API (no SDK
// dependency). Provider detail is isolated behind sendLegalEmail() so a
// different mail provider can be swapped in later without touching the route.
//
// Per brand standards this email is LIGHT MODE only: it declares
// color-scheme: light, and re-asserts the light palette under
// prefers-color-scheme: dark and Outlook.com ([data-ogsc]) so dark-mode
// clients can't invert it. Table-based with inline styles for client safety.

const POSTMARK_API = "https://api.postmarkapp.com/email";

const DOC_LABEL: Record<string, string> = {
  PRIVACY: "Privacy Policy",
  TERMS: "Terms of Use",
};

export type SendResult = { ok: true; messageId?: string } | { ok: false; error: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appBaseUrl(): string {
  return (
    process.env.LEGAL_APP_BASE_URL ||
    process.env.NEXT_BASE_URL ||
    "https://platform.lightriderinc.com"
  ).replace(/\/+$/, "");
}

function legalUrl(docType: string): string {
  const path = docType === "TERMS" ? "/legal/terms-of-use" : "/legal/privacy";
  return `${appBaseUrl()}${path}`;
}

function logoUrl(): string {
  const base = (
    process.env.NEXT_BASE_URL ||
    process.env.LEGAL_APP_BASE_URL ||
    "https://platform.lightriderinc.com"
  ).replace(/\/+$/, "");
  return process.env.LEGAL_EMAIL_LOGO_URL || `${base}/lr-email-logo.png`;
}

/** Builds the subject / HTML / text for a single legal-update notice. */
export function renderLegalEmail(p: PendingEmail): {
  subject: string;
  html: string;
  text: string;
} {
  const label = DOC_LABEL[p.docType] ?? p.docType;
  const date = new Date(p.effectiveAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const url = legalUrl(p.docType);
  const logo = logoUrl();
  const base = appBaseUrl();
  const subject = `Update to our ${label} — effective ${date}`;
  const preheader = `Our ${label} changes on ${date}. Review and accept at your next sign-in.`;

  const summaryHtml = p.summary
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;"><tr><td class="lr-summary" style="background:#f3f3f3;border-left:3px solid #ef3b39;padding:12px 16px;font-size:14px;line-height:1.6;color:#535353;border-radius:2px;">${escapeHtml(
        p.summary,
      )}</td></tr></table>`
    : "";
  const summaryText = p.summary ? `\n${p.summary}\n` : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta name="x-apple-disable-message-reformatting">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  /* Re-assert the light palette so dark-mode clients can't invert it. */
  @media (prefers-color-scheme: dark) {
    .lr-bg { background:#f3f3f3 !important; }
    .lr-card { background:#ffffff !important; border-color:#eaeaea !important; }
    .lr-h1, .lr-strong { color:#0b0b0b !important; }
    .lr-text { color:#3f3f3f !important; }
    .lr-summary { background:#f3f3f3 !important; color:#535353 !important; }
    .lr-footcell { border-color:#eaeaea !important; }
    .lr-foot { color:#666666 !important; }
  }
  [data-ogsc] .lr-bg { background:#f3f3f3 !important; }
  [data-ogsc] .lr-card { background:#ffffff !important; border-color:#eaeaea !important; }
  [data-ogsc] .lr-h1, [data-ogsc] .lr-strong { color:#0b0b0b !important; }
  [data-ogsc] .lr-text { color:#3f3f3f !important; }
  [data-ogsc] .lr-summary { background:#f3f3f3 !important; color:#535353 !important; }
  [data-ogsc] .lr-footcell { border-color:#eaeaea !important; }
  [data-ogsc] .lr-foot { color:#666666 !important; }
</style>
</head>
<body class="lr-bg" style="margin:0;padding:0;background:#f3f3f3;-webkit-font-smoothing:antialiased;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3f3f3;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="lr-bg" style="background:#f3f3f3;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="lr-card" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #eaeaea;border-radius:2px;overflow:hidden;font-family:'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td height="4" style="height:4px;line-height:4px;font-size:0;background-color:#ef3b39;background-image:linear-gradient(90deg,#ef3b39,#f26739,#ffcd34);">&nbsp;</td></tr>
        <tr><td style="padding:30px 40px 6px;">
          <img src="${logo}" width="188" alt="Light Rider" style="display:block;border:0;outline:none;text-decoration:none;width:188px;max-width:66%;height:auto;">
        </td></tr>
        <tr><td style="padding:18px 40px 0;">
          <h1 class="lr-h1" style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#0b0b0b;font-weight:700;">Our ${escapeHtml(
            label,
          )} is changing</h1>
          <p class="lr-text" style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f3f;">We're updating our ${escapeHtml(
            label,
          )}, effective <strong class="lr-strong" style="color:#0b0b0b;">${escapeHtml(
            date,
          )}</strong>. Please review the changes — you'll be asked to accept them the next time you sign in.</p>
          ${summaryHtml}
        </td></tr>
        <tr><td style="padding:8px 40px 34px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ef3b39" style="border-radius:2px;">
            <a href="${url}" style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:2px;">Review the ${escapeHtml(
              label,
            )}</a>
          </td></tr></table>
        </td></tr>
        <tr><td class="lr-footcell" style="padding:20px 40px;border-top:1px solid #eaeaea;">
          <p class="lr-foot" style="margin:0 0 4px;font-size:12px;line-height:1.6;color:#666666;">You're receiving this because you have a Light Rider account.</p>
          <p class="lr-foot" style="margin:0;font-size:12px;line-height:1.6;color:#666666;">Light Rider Inc. · <a href="${base}" style="color:#ef3b39;text-decoration:none;">platform.lightriderinc.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Our ${label} is changing, effective ${date}.

Please review the changes — you'll be asked to accept them the next time you sign in.
${summaryText}
Review the ${label}: ${url}

You're receiving this because you have a Light Rider account.
Light Rider Inc. · platform.lightriderinc.com`;

  return { subject, html, text };
}

/**
 * Sends one legal-update notice via Postmark. Returns a result rather than
 * throwing, so the caller records success per-recipient and lets failures be
 * retried on the next run. Requires POSTMARK_SERVER_TOKEN and LEGAL_EMAIL_FROM.
 */
export async function sendLegalEmail(p: PendingEmail): Promise<SendResult> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  const from = process.env.LEGAL_EMAIL_FROM;
  if (!token || !from) {
    return { ok: false, error: "POSTMARK_SERVER_TOKEN or LEGAL_EMAIL_FROM not set" };
  }

  const { subject, html, text } = renderLegalEmail(p);
  try {
    const res = await fetch(POSTMARK_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: from,
        To: p.email,
        Subject: subject,
        HtmlBody: html,
        TextBody: text,
        MessageStream: process.env.POSTMARK_MESSAGE_STREAM || "outbound",
        Tag: "legal-update",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[legal-email] Postmark error", res.status, body);
      return { ok: false, error: `Postmark HTTP ${res.status}` };
    }
    const data = (await res.json()) as { MessageID?: string };
    return { ok: true, messageId: data.MessageID };
  } catch (e) {
    console.error("[legal-email] send failed", e);
    return { ok: false, error: (e as Error).message };
  }
}
