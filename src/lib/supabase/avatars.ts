import { AVATAR_BUCKET, supabase } from "@/lib/supabase/client";

/**
 * Stores a user's cropped avatar and returns its public URL.
 *
 * The object path is keyed by the Logto user id and is stable, so re-uploading
 * overwrites in place rather than accumulating orphaned files. Because the
 * path is stable, the returned URL carries a cache-busting query param — the
 * CDN and the browser would otherwise keep serving the previous image.
 *
 * @param logtoUserId the Logto `sub` claim
 */
export async function uploadAvatar(
  logtoUserId: string,
  file: File,
): Promise<string> {
  const path = `${logtoUserId}/avatar.webp`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (error) {
    console.error("[avatars] upload failed:", error);
    throw new Error("Could not upload that image. Try again.");
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
