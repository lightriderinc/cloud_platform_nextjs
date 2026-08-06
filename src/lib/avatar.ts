import { Avatar, Style } from "@dicebear/core";
import pixelbot from "@dicebear/styles/pixelbot.json";

const style = new Style(pixelbot);

const BACKGROUND_COLORS = [
  "0f172a",
  "111827",
  "172554",
  "1e1b4b",
  "2e1065",
  "3b0764",
  "500724",
  "022c22",
  "042f2e",
  "083344",
  "610034",
  "300033",
  "0f0033",
  "000a33",
  "002233",
  "003324",
  "1f3300",
  "332f00",
  "332000",
  "330500",
];

const GLOW_COLORS = [
  "7dd3fc",
  "5eead4",
  "86efac",
  "bef264",
  "fde68a",
  "fdba74",
  "f9a8d4",
  "c4b5fd",
  "ffffff",
  "b6e3f4",
  "b8bcf4",
  "f5bdcb",
  "e9bcf5",
  "bccbf5",
  "bcf5f1",
  "bcf5d2",
  "d3f5bc",
  "f5e6bc",
];

// ---------------------------------------------------------------------------
// Upload contract
//
// Shared between the avatar editor UI and whatever server action stores the
// result. These live here, not in EditAvatarModal, because that file carries a
// `"use client"` directive: every export of a client module is replaced by a
// client reference when imported from a Server Component, so reading this
// constant inside a server action would throw rather than give you the string.
// ---------------------------------------------------------------------------

/** FormData key the cropped file is sent under. */
export const AVATAR_FORM_FIELD = "avatar";
/** MIME type of the cropped image the editor produces. */
export const AVATAR_OUTPUT_TYPE = "image/png";
/** Edge length, in px, of the square the editor exports. */
export const AVATAR_OUTPUT_SIZE = 512;

/** Generates a deterministic pixelbot avatar data URI seeded by the user's full name. */
export function getAvatarDataUri(seed: string): string {
  const avatar = new Avatar(style, {
    seed,
    backgroundColor: BACKGROUND_COLORS,
    glowColor: GLOW_COLORS,
  });
  return avatar.toDataUri();
}

/** Last-resort text fallback. "Dan Delgado Ayala" -> "DD". */
export function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The two sources every avatar in the app renders from.
 *
 * `src` is the user's own picture (an upload, or a social provider's link) and
 * may be null or a URL that no longer resolves. `fallbackSrc` is the generated
 * pixelbot, which always works.
 *
 * Every avatar call site goes through this so the header and the account page
 * can't drift — they previously disagreed, which is why a newly uploaded
 * picture showed on one and not the other. Keep it that way: don't collapse
 * these into a single pre-resolved URL at the call site, because AvatarImage
 * needs both to recover from a *load* failure, not just a missing value.
 */
export function resolveAvatarSources({
  picture,
  name,
  email,
}: {
  picture?: string | null;
  name?: string | null;
  email?: string | null;
}): { src: string | null; fallbackSrc: string } {
  return {
    src: picture ?? null,
    fallbackSrc: getAvatarDataUri(name || email || "user"),
  };
}
