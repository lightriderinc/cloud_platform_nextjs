import { createClient } from "@supabase/supabase-js";

// Server-only. Never import this from a client component — the service role
// key bypasses RLS.
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Without real credentials, this still constructs the client so imports
// don't crash the app (or the build) — any actual call will fail loudly with
// Supabase's own auth error, the same placeholder-so-imports-don't-crash
// pattern as src/lib/stripe/client.ts.
export const supabase = createClient(
  url || "http://localhost:54321",
  serviceRoleKey || "service_role_placeholder",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET || "avatars";
