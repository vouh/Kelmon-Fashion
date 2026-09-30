import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const out = path.join(root, "marketing", "launch");
const posterOut = path.join(out, "posters");
const frameOut = path.join(out, "video-frames");
await fs.mkdir(posterOut, { recursive: true });
await fs.mkdir(frameOut, { recursive: true });

const logo = path.join(root, "public", "logo.png");
const woman = path.join(root, "public", "images", "about", "kelmon-young-woman.webp");
const man = path.join(root, "public", "images", "about", "kelmon-young-man.webp");
const bag = path.join(root, "public", "images", "heroes", "kelmon-bag.png");
const perfume = path.join(root, "public", "images", "heroes", "kelmon-men-fragrance.png");
const accessories = path.join(root, "public", "images", "heroes", "kelmon-accessories.png");

const purple = "#8436a8";
const deep = "#35143f";
const gold = "#b98a32";
const cream = "#fbf8fc";

const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
// librsvg reliably embeds PNG data URIs; normalise WebP/JPEG sources in memory.
const dataUri = async (file) => `data:image/png;base64,${(await sharp(file).png().toBuffer()).toString("base64")}`;
const [logoUri, womanUri, manUri, bagUri, perfumeUri, accessoriesUri] = await Promise.all(
  [logo, woman, man, bag, perfume, accessories].map(dataUri),
);

function textBlock({ x, y, width, kicker, title, lines, cta, align = "start", titleSize = 92 }) {
  const anchor = align === "middle" ? "middle" : "start";
  const lineX = align === "middle" ? x + width / 2 : x;
  return `
    <text x="${lineX}" y="${y}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" letter-spacing="5" fill="${gold}">${esc(kicker.toUpperCase())}</text>
    <text x="${lineX}" y="${y + 105}" text-anchor="${anchor}" font-family="Georgia, 'Times New Roman', serif" font-size="${titleSize}" font-weight="700" fill="${deep}">${esc(title)}</text>
    ${lines.map((line, index) => `<text x="${lineX}" y="${y + 168 + index * 40}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="27" fill="#624c68">${esc(line)}</text>`).join("")}
    <rect x="${align === "middle" ? lineX - 155 : x}" y="${y + 240}" width="310" height="66" rx="33" fill="${purple}" />
    <text x="${align === "middle" ? lineX : x + 155}" y="${y + 283}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" letter-spacing="2" fill="white">${esc(cta.toUpperCase())}</text>`;
}

async function renderPoster(filename, width, height) {
  const portrait = height / width > 1.5;
  const square = width === height;
  const logoW = Math.round(width * (portrait ? 0.42 : 0.46));
  const logoH = Math.round(logoW * 0.36);
  const personW = portrait ? Math.round(width * 0.92) : square ? Math.round(width * 0.72) : Math.round(width * 0.58);
  const personH = portrait ? Math.round(height * 0.58) : square ? Math.round(height * 0.58) : Math.round(height * 0.8);
  const personX = portrait ? Math.round(width * 0.04) : square ? Math.round(width * 0.38) : Math.round(width * 0.43);
  const personY = portrait ? Math.round(height * 0.31) : square ? Math.round(height * 0.34) : Math.round(height * 0.14);
  const copy = portrait
    ? textBlock({ x: 70, y: 300, width: width - 140, kicker: "Official launch", title: "KELMON IS LIVE", lines: ["Your glam era starts here.", "Look good. Smell unforgettable. Carry confidence."], cta: "Shop Kelmon", align: "middle", titleSize: 74 })
    : textBlock({ x: 70, y: square ? 245 : 280, width: Math.round(width * 0.48), kicker: "Official launch", title: "KELMON IS LIVE", lines: ["Your glam era starts here.", "Beauty · Fashion · Glamour"], cta: "Shop Kelmon", titleSize: square ? 66 : 72 });
  const svg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="lav" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#f1e3f7"/></linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#lav)"/>
    <circle cx="${Math.round(width * .9)}" cy="${Math.round(height * .18)}" r="${Math.round(width * .28)}" fill="#e8d2f0" opacity=".55"/>
    <rect x="0" y="0" width="18" height="${height}" fill="${purple}"/>
    <image href="${logoUri}" x="${Math.round((width - logoW) / 2)}" y="32" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet"/>
    <image href="${womanUri}" x="${personX}" y="${personY}" width="${personW}" height="${personH}" preserveAspectRatio="xMidYMid meet"/>
    ${copy}
    <text x="${width / 2}" y="${height - 40}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="3" fill="${gold}">BEAUTY · FASHION · GLAMOUR</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(posterOut, filename));
}

await Promise.all([
  renderPoster("kelmon-launch-feed-1080x1350.png", 1080, 1350),
  renderPoster("kelmon-launch-story-1080x1920.png", 1080, 1920),
  renderPoster("kelmon-launch-square-1080x1080.png", 1080, 1080),
]);

const scenes = [
  { name: "01-logo", image: logoUri, title: "YOUR GLAM ERA", subtitle: "STARTS HERE", color: deep, imageY: 360, imageH: 500 },
  { name: "02-bag-model", image: womanUri, title: "CARRY CONFIDENCE", subtitle: "Bags made for your entrance.", color: purple, imageY: 260, imageH: 1320 },
  { name: "03-bag-closeup", image: bagUri, title: "STYLE IN EVERY DETAIL", subtitle: "Your next favourite bag.", color: deep, imageY: 350, imageH: 1050 },
  { name: "04-perfume-model", image: manUri, title: "SMELL UNFORGETTABLE", subtitle: "Find your signature scent.", color: purple, imageY: 220, imageH: 1370 },
  { name: "05-products", image: accessoriesUri, title: "THE FINISHING TOUCH", subtitle: "Perfumes · Bags · Accessories", color: deep, imageY: 360, imageH: 1000 },
  { name: "06-final", image: logoUri, title: "KELMON IS LIVE", subtitle: "Shop Kelmon — delivered to you.", color: purple, imageY: 330, imageH: 500 },
];

for (const [index, scene] of scenes.entries()) {
  const isPerson = index === 1 || index === 3;
  const imageW = isPerson ? 1000 : 900;
  const x = (1080 - imageW) / 2;
  const titleY = index === 0 || index === 5 ? 1050 : 1580;
  const svg = `
  <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#f0e1f6"/></linearGradient></defs>
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <circle cx="930" cy="240" r="260" fill="#e6c9f0" opacity=".55"/>
    <rect x="0" y="0" width="20" height="1920" fill="${scene.color}"/>
    <image href="${scene.image}" x="${x}" y="${scene.imageY}" width="${imageW}" height="${scene.imageH}" preserveAspectRatio="xMidYMid meet"/>
    <text x="540" y="${titleY}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="54" font-weight="700" fill="${scene.color}">${scene.title}</text>
    <text x="540" y="${titleY + 68}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#604c68">${scene.subtitle}</text>
    <text x="540" y="1840" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800" letter-spacing="4" fill="${gold}">BEAUTY · FASHION · GLAMOUR</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(frameOut, `${scene.name}.png`));
}

const brief = `# Kelmon launch campaign\n\n## Campaign\n\n- Campaign: **Your glam era starts here.**\n- Supporting line: **Look good. Smell unforgettable. Carry confidence.**\n- CTA: **Shop Kelmon — delivered to you.**\n\n## 15-second sequence\n\n1. 0–2s — Logo reveal: Your glam era starts here.\n2. 2–5s — Woman presents the lavender bag.\n3. 5–8s — Bag detail: Style in every detail.\n4. 8–11s — Man applies perfume: Smell unforgettable.\n5. 11–13s — Product montage: Perfumes · Bags · Accessories.\n6. 13–15s — Kelmon is live. Shop Kelmon — delivered to you.\n\n## Launch caption\n\n**Kelmon is live. 💜**\n\nYour glam era starts here. Discover perfumes that make an entrance, bags that carry your confidence, and accessories that finish the look.\n\nShop Kelmon today — delivered to you.\n\n#Kelmon #YourGlamEra #KenyanFashion #PerfumeKenya #CampusStyle #ShopKenya\n`;
await fs.writeFile(path.join(out, "launch-brief.md"), brief, "utf8");

console.log(`Launch kit generated in ${out}`);
