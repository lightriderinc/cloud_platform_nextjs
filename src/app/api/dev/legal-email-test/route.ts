import { NextResponse } from "next/server";
import { sendLegalEmail } from "@/lib/legal/email";
import type { PendingEmail } from "@/lib/legal/notifications";

export const dynamic = "force-dynamic";

// Dev-only: send one sample legal-update email to ?to=<address> so you can
// confirm Postmark is wired and check inbox placement. Disabled in production.
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in production" }, { status: 403 });
  }
  const to = new URL(req.url).searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "pass ?to=you@example.com" }, { status: 400 });
  }

  const sample: PendingEmail = {
    logtoUserId: "dev-test",
    email: to,
    documentId: "dev-test",
    docType: "PRIVACY",
    version: 2,
    effectiveAt: new Date(Date.now() + 5 * 86_400_000),
    summary: "Clarified the data-retention section and added a cookies disclosure.",
  };

  const result = await sendLegalEmail(sample);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
