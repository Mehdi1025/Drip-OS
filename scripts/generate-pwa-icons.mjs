import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const publicDir = path.join(process.cwd(), "public");
const brandingDir = path.join(publicDir, "branding");
const outDir = path.join(publicDir, "icons");

const sourceLogo = path.join(brandingDir, "logo-horizontal-fond-clair.png");
if (!fs.existsSync(sourceLogo)) {
  console.error(
    "Missing",
    sourceLogo,
    "— add logo-horizontal-fond-clair.png to public/branding/"
  );
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const meta = await sharp(sourceLogo).metadata();
const height = meta.height ?? 141;
/** Carte symbole à gauche du wordmark (logo 675×141 px). */
const cardCropWidth = Math.min(Math.round(height * 1.05), meta.width ?? height);

let cardIcon = await sharp(sourceLogo)
  .extract({ left: 0, top: 0, width: cardCropWidth, height })
  .png()
  .toBuffer();

/** Fond papier brand pour favicon carré. */
const pad = Math.round(cardCropWidth * 0.12);
const squareSize = cardCropWidth + pad * 2;
cardIcon = await sharp({
  create: {
    width: squareSize,
    height: squareSize,
    channels: 4,
    background: { r: 247, g: 245, b: 242, alpha: 1 },
  },
})
  .composite([{ input: cardIcon, top: pad, left: pad }])
  .png()
  .toBuffer();

const appIconPath = path.join(brandingDir, "app-icon.png");
await sharp(cardIcon).png().toFile(appIconPath);
console.log("wrote branding/app-icon.png");

const rasterSizes = [
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

for (const { name, size } of rasterSizes) {
  await sharp(cardIcon).resize(size, size).png().toFile(path.join(outDir, name));
  console.log("wrote icons/" + name);
}

const maskableBg = await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 247, g: 245, b: 242, alpha: 1 },
  },
})
  .png()
  .toBuffer();

const card512 = await sharp(cardIcon).resize(360, 360).png().toBuffer();
await sharp(maskableBg)
  .composite([{ input: card512, gravity: "centre" }])
  .png()
  .toFile(path.join(outDir, "icon-512-maskable.png"));
console.log("wrote icons/icon-512-maskable.png");

await sharp(cardIcon).resize(32, 32).png().toFile(path.join(publicDir, "favicon.ico"));
console.log("wrote favicon.ico");

await sharp(cardIcon).resize(32, 32).png().toFile(path.join(publicDir, "favicon-32.png"));

fs.writeFileSync(
  path.join(publicDir, "favicon.svg"),
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <image href="/branding/app-icon.png" width="32" height="32"/>
</svg>`,
  "utf8"
);
console.log("wrote favicon.svg (réf. app-icon)");
