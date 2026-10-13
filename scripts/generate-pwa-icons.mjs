import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#ccff00"/>
  <rect x="28" y="28" width="456" height="456" fill="none" stroke="#0a0a0a" stroke-width="36"/>
  <text x="256" y="300" font-family="Arial Black, Arial, sans-serif" font-size="108" font-weight="900" text-anchor="middle" fill="#0a0a0a">DRIP</text>
</svg>`;

const outDir = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const sizes = [
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-512-maskable.png", size: 512 },
];

for (const { name, size } of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, name));
  console.log("wrote", name);
}
