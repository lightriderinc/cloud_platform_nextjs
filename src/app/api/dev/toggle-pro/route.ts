import { NextResponse } from "next/server";
import { getLogtoContext } from "@logto/next/server-actions";
import { logtoConfig } from "@/app/logto";
import { grantProRole, revokeProRole } from "@/lib/logto-management";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);
  if (!isAuthenticated || !claims?.sub) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { action } = await request.json();

  try {
    if (action === "grant") {
      await grantProRole(claims.sub);
    } else if (action === "revoke") {
      await revokeProRole(claims.sub);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[toggle-pro]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
