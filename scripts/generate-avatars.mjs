/**
 * Generates Kelmon's avatar set into public/avatars/ with DiceBear's
 * "Avataaars" style (artwork by Pablo Stanley — free for personal and
 * commercial use; DiceBear code is MIT).
 *
 * The avatars are plain SVG files served from our own site, so DiceBear is a
 * dev dependency only and nothing extra ships to the browser.
 *
 *   node scripts/generate-avatars.mjs
 *
 * Edit AVATARS below to change or add characters, then re-run. Keep
 * lib/avatars.ts in step with the ids.
 */
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "public", "avatars");

// Skin tones (hex, no #), deepest first.
const SKIN = { deep: "614335", brown: "ae5d29", warm: "d08b5b", tan: "edb98a", light: "ffdbb4" };
const HAIR = { black: "2c1b18", brown: "4a312c", auburn: "a55728", blonde: "b58143", pink: "f59797", platinum: "ecdcbf" };

// Brand-friendly backgrounds.
const BG = {
  lilac: "d9c8f2",
  rose: "f7c9d9",
  gold: "f6dfa8",
  sky: "bfdcf3",
  mint: "c7ead7",
  peach: "f8cdb0",
  purple: "b98ad6",
  cream: "f3ece4",
};

const AVATARS = [
  { id: "afro-queen", top: "fro", skin: "deep", hair: "black", clothing: "shirtScoopNeck", clothesColor: "e6007e", bg: "gold", accessories: "round", mouth: "smile", eyes: "happy" },
  { id: "curly-glow", top: "curly", skin: "brown", hair: "black", clothing: "overall", clothesColor: "5199e4", bg: "rose", mouth: "twinkle", eyes: "default" },
  { id: "locs-king", top: "dreads", skin: "deep", hair: "black", clothing: "hoodie", clothesColor: "262e33", bg: "purple", mouth: "smile", eyes: "happy", facialHair: "beardLight" },
  { id: "bun-boss", top: "bun", skin: "warm", hair: "brown", clothing: "blazerAndShirt", clothesColor: "262e33", bg: "sky", accessories: "prescription02", mouth: "smile", eyes: "default" },
  { id: "wavy-chill", top: "shortWaved", skin: "brown", hair: "black", clothing: "shirtCrewNeck", clothesColor: "ff488e", bg: "mint", mouth: "default", eyes: "happy" },
  { id: "big-hair", top: "bigHair", skin: "deep", hair: "black", clothing: "collarAndSweater", clothesColor: "b1e2ff", bg: "peach", mouth: "smile", eyes: "wink" },
  { id: "sunnies", top: "shortFlat", skin: "warm", hair: "black", clothing: "shirtVNeck", clothesColor: "ffffff", bg: "gold", accessories: "sunglasses", mouth: "smile", eyes: "default" },
  { id: "long-straight", top: "straight01", skin: "tan", hair: "brown", clothing: "blazerAndSweater", clothesColor: "e6007e", bg: "lilac", mouth: "twinkle", eyes: "happy" },
  { id: "headwrap", top: "turban", skin: "deep", hair: "black", clothing: "shirtScoopNeck", clothesColor: "ffc5d9", bg: "mint", hatColor: "e6007e", mouth: "smile", eyes: "happy" },
  { id: "pink-bob", top: "bob", skin: "light", hair: "pink", clothing: "graphicShirt", clothesColor: "262e33", bg: "sky", mouth: "smile", eyes: "wink" },
  { id: "caesar", top: "theCaesar", skin: "deep", hair: "black", clothing: "blazerAndShirt", clothesColor: "3c4f5c", bg: "cream", mouth: "smile", eyes: "default", facialHair: "beardMedium" },
  { id: "curvy", top: "curvy", skin: "brown", hair: "auburn", clothing: "overall", clothesColor: "a7ffc4", bg: "purple", accessories: "round", mouth: "twinkle", eyes: "happy" },
  { id: "frizzle", top: "frizzle", skin: "warm", hair: "black", clothing: "hoodie", clothesColor: "5199e4", bg: "rose", mouth: "smile", eyes: "default" },
  { id: "shaved-sides", top: "shavedSides", skin: "tan", hair: "platinum", clothing: "shirtCrewNeck", clothesColor: "e6007e", bg: "lilac", mouth: "default", eyes: "happy" },
  { id: "winter-hat", top: "winterHat1", skin: "brown", hair: "black", clothing: "collarAndSweater", clothesColor: "ff5c5c", bg: "sky", hatColor: "ff5c5c", mouth: "smile", eyes: "happy" },
  { id: "hijab", top: "hijab", skin: "warm", hair: "black", clothing: "shirtScoopNeck", clothesColor: "65c9ff", bg: "cream", hatColor: "929598", mouth: "smile", eyes: "default" },
];

mkdirSync(OUT, { recursive: true });

for (const a of AVATARS) {
  const svg = createAvatar(avataaars, {
    seed: a.id,
    size: 256,
    radius: 50,
    backgroundColor: [BG[a.bg]],
    backgroundType: ["solid"],
    top: [a.top],
    skinColor: [SKIN[a.skin]],
    hairColor: [HAIR[a.hair]],
    hatColor: a.hatColor ? [a.hatColor] : undefined,
    clothing: [a.clothing],
    clothesColor: [a.clothesColor],
    // Graphic tees get a neutral print (the default set includes logo-like ones).
    clothingGraphic: ["diamond"],
    mouth: [a.mouth],
    eyes: [a.eyes],
    eyebrows: ["defaultNatural"],
    accessories: a.accessories ? [a.accessories] : undefined,
    accessoriesProbability: a.accessories ? 100 : 0,
    facialHair: a.facialHair ? [a.facialHair] : undefined,
    facialHairProbability: a.facialHair ? 100 : 0,
  }).toString();
  writeFileSync(join(OUT, `${a.id}.svg`), svg);
}

console.log(`Generated ${AVATARS.length} avatars in public/avatars/`);
