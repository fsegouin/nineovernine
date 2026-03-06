import sharp from "sharp";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTENT_PATH = join(ROOT, "lib", "content.json");

async function main() {
  const content = JSON.parse(readFileSync(CONTENT_PATH, "utf-8"));
  const conversions: { oldPath: string; newPath: string }[] = [];

  for (const project of content.projects) {
    if (project.gallery) {
      for (const item of project.gallery) {
        if (item.type === "image" && item.src && !item.src.endsWith(".webp")) {
          const oldSrc = item.src as string;
          const newSrc = oldSrc.replace(/\.(png|jpg|jpeg)$/i, ".webp");
          conversions.push({ oldPath: oldSrc, newPath: newSrc });
          item.src = newSrc;
        }
      }
    }
  }

  for (const { oldPath, newPath } of conversions) {
    const absoluteOld = join(ROOT, "public", oldPath);
    const absoluteNew = join(ROOT, "public", newPath);
    await sharp(absoluteOld).webp({ quality: 85 }).toFile(absoluteNew);
    unlinkSync(absoluteOld);
    console.log(`  converted: ${oldPath} -> ${newPath}`);
  }

  if (conversions.length > 0) {
    writeFileSync(CONTENT_PATH, JSON.stringify(content, null, 2) + "\n");
  }
  console.log(`\nConverted ${conversions.length} images to WebP.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
