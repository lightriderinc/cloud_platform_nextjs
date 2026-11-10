import { NextResponse } from "next/server";
import { getUsersPendingEmail, markNotified } from "@/lib/legal/notifications";
import { sendLegalEmail } from "@/lib/legal/email";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function run() {
  const pending = await getUsersPendingEmail();
  let sent = 0;
  const failures: { email: string; error: string }[] = [];

  for (const p of pending) {
    const result = await sendLegalEmail(p);
    if (result.ok) {
      await markNotified(p.logtoUserId, p.documentId, "EMAIL");
      sent++;
    } else {
      failures.push({ email: p.email, error: result.error });
    }
  }

  return NextResponse.json({
    candidates: pending.length,
    sent,
    failed: failures.length,
    failures,
  });
}

// Vercel Cron invokes this route with a GET and the CRON_SECRET as a bearer
// token. POST is supported for manual triggering with the same secret.
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return run();
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return run();
}
