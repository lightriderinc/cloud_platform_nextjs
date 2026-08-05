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

/** Generates a deterministic pixelbot avatar data URI seeded by the user's full name. */
export function getAvatarDataUri(seed: string): string {
  const avatar = new Avatar(style, {
    seed,
    backgroundColor: BACKGROUND_COLORS,
    glowColor: GLOW_COLORS,
  });
  return avatar.toDataUri();
}
