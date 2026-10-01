import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assetDir = path.join(root, "marketing", "launch", "who-we-are");
const scenePath = path.join(assetDir, "kelmon-launch-models.png");
const logoPath = path.join(assetDir, "kelmon-logo-source.jpg");
const outputPath = path.join(assetDir, "kelmon-meet-us-launch-1080x1350.png");

const width = 1080;
const height = 1350;

const logo = await sharp(logoPath)
  .extract({ left: 170, top: 120, width: 1190, height: 570 })
  .resize({ width: 330, height: 158, fit: "contain", background: "#ffffff" })
  .png()
  .toBuffer();

const overlay = Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="panel" x1="0" x2="1">
      <stop offset="0%" stop-color="#fffdfc" stop-opacity="0.99"/>
      <stop offset="72%" stop-color="#fffdfc" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="#fffdfc" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#321a3a" flood-opacity="0.12"/>
    </filter>
  </defs>

  <rect width="690" height="1350" fill="url(#panel)"/>
  <rect x="0" y="0" width="12" height="1350" fill="#8e44ad"/>
  <rect x="44" y="44" width="374" height="178" rx="26" fill="#ffffff" stroke="#eadff0" filter="url(#shadow)"/>

  <text x="52" y="298" fill="#9b4abe" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" letter-spacing="4">OFFICIAL LAUNCH</text>
  <text x="52" y="358" fill="#2d1834" font-family="Georgia, 'Times New Roman', serif" font-size="47" font-weight="700">MEET KELMON</text>
  <text x="52" y="410" fill="#8e44ad" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="800">WE’RE NOW LIVE!</text>
  <rect x="52" y="438" width="88" height="5" rx="2.5" fill="#d1a33a"/>

  <text x="52" y="498" fill="#3c2942" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="700">
    <tspan x="52" dy="0">Kelmon is a Kenyan online beauty and</tspan>
    <tspan x="52" dy="33">fashion store created for young people</tspan>
    <tspan x="52" dy="33">who want to look good, smell amazing</tspan>
    <tspan x="52" dy="33">and carry confidence—without overspending.</tspan>
  </text>

  <text x="52" y="662" fill="#58445e" font-family="Arial, Helvetica, sans-serif" font-size="20">
    <tspan x="52" dy="0">We bring you stylish bags, unforgettable perfumes,</tspan>
    <tspan x="52" dy="29">earrings and fashion accessories at affordable prices.</tspan>
    <tspan x="52" dy="29">Shop online, pay conveniently through M-Pesa, and</tspan>
    <tspan x="52" dy="29">have delivery arranged within 1–3 days.</tspan>
  </text>

  <text x="52" y="806" fill="#58445e" font-family="Arial, Helvetica, sans-serif" font-size="20">
    <tspan x="52" dy="0">We’re excited to officially open our doors and welcome</tspan>
    <tspan x="52" dy="29">you into the Kelmon experience. This is more than a</tspan>
    <tspan x="52" dy="29">shop—it’s the beginning of a youthful lifestyle brand</tspan>
    <tspan x="52" dy="29">built to make fashion and beauty easier to discover,</tspan>
    <tspan x="52" dy="29">access and enjoy.</tspan>
  </text>

  <rect x="52" y="992" width="500" height="2" fill="#e7d9ea"/>
  <text x="52" y="1042" fill="#2d1834" font-family="Georgia, 'Times New Roman', serif" font-size="29" font-style="italic" font-weight="700">Smell good. Look good. Feel confident.</text>

  <rect x="52" y="1090" width="410" height="70" rx="35" fill="#8e44ad"/>
  <text x="257" y="1135" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="800" letter-spacing="1.3">SHOP NOW</text>
  <text x="52" y="1214" fill="#8e44ad" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="800">kelmonfashion.com</text>
  <text x="52" y="1254" fill="#7b667f" font-family="Arial, Helvetica, sans-serif" font-size="17">M-Pesa payments  •  Delivery arranged within 1–3 days</text>
</svg>`);

await sharp(scenePath)
  .resize(width, height, { fit: "cover", position: "center" })
  .composite([
    { input: overlay, left: 0, top: 0 },
    { input: logo, left: 66, top: 54 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

console.log(outputPath);
