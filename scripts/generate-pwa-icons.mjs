import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const brandPath = path.join(process.cwd(), "public", "brand-mark.svg");
const svg = fs.readFileSync(brandPath, "utf8");

/** Icône maskable : même goutte, plus de marge (zone sûre ~80 %). */
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" fill="#5B2EFF"/>
  <path
    d="M256 118c0 0-72 122-72 194a72 72 0 1 0 144 0C328 240 256 118 256 118Z"
    fill="#F7F5F2"
  />
  <ellipse cx="224" cy="278" rx="16" ry="24" fill="#5B2EFF" opacity="0.22"/>
</svg>`;

const publicDir = path.join(process.cwd(), "public");
const outDir = path.join(publicDir, "icons");
fs.mkdirSync(outDir, { recursive: true });

const rasterSizes = [
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

for (const { name, size } of rasterSizes) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(outDir, name));
  console.log("wrote icons/" + name);
}

await sharp(Buffer.from(svgMaskable))
  .resize(512, 512)
  .png()
  .toFile(path.join(outDir, "icon-512-maskable.png"));
console.log("wrote icons/icon-512-maskable.png");

await sharp(Buffer.from(svg)).resize(32, 32).png().toFile(path.join(publicDir, "favicon.ico"));
console.log("wrote favicon.ico");

fs.writeFileSync(path.join(publicDir, "favicon.svg"), svg, "utf8");
console.log("wrote favicon.svg");
