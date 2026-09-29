/**
 * Kelmon's avatar set, offered alongside uploading a photo.
 *
 * Generated into public/avatars/ by scripts/generate-avatars.mjs with DiceBear's
 * "Avataaars" style (artwork by Pablo Stanley, free for personal and commercial
 * use). They're stored in `profiles.avatar_url` as plain paths, exactly as an
 * uploaded photo's URL would be, so nothing downstream has to tell them apart.
 * Keep the ids here in step with the script.
 */

export interface AvatarOption {
  id: string;
  label: string;
  src: string;
}

/** Shown when someone has neither uploaded a photo nor picked an avatar. */
export const DEFAULT_AVATAR = "/avatars/default.svg";

const AVATARS: [id: string, label: string][] = [
  ["afro-queen", "Afro"],
  ["curly-glow", "Curls"],
  ["locs-king", "Locs"],
  ["bun-boss", "Bun"],
  ["wavy-chill", "Waves"],
  ["big-hair", "Big hair"],
  ["sunnies", "Sunnies"],
  ["long-straight", "Long hair"],
  ["headwrap", "Headwrap"],
  ["pink-bob", "Pink bob"],
  ["caesar", "Caesar"],
  ["curvy", "Curvy"],
  ["frizzle", "Frizzle"],
  ["shaved-sides", "Shaved sides"],
  ["winter-hat", "Beanie"],
  ["hijab", "Hijab"],
];

export const avatarLibrary: AvatarOption[] = AVATARS.map(([id, label]) => ({
  id,
  label,
  src: `/avatars/${id}.svg`,
}));
