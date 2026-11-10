import { createHash } from "crypto";
import { LEGAL_BUCKET, supabase } from "@/lib/supabase/client";

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Archives the exact rendered text of a published version to Supabase Storage
 * and returns { path, hash }. Path is deterministic per docType+version so a
 * re-run overwrites in place. Mirrors the avatar upload pattern.
 */
export async function archivePolicyText(
  docType: string,
  version: number,
  text: string,
): Promise<{ path: string; hash: string }> {
  const path = `${docType.toLowerCase()}/v${version}.md`;
  const { error } = await supabase.storage
    .from(LEGAL_BUCKET)
    .upload(path, Buffer.from(text, "utf8"), {
      upsert: true,
      contentType: "text/markdown",
    });
  if (error) {
    console.error("[legal] archive failed:", error);
    throw new Error("Could not archive policy text.");
  }
  return { path, hash: sha256(text) };
}
