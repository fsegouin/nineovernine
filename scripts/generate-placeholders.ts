import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTENT_PATH = join(ROOT, "lib", "content.json");

interface GalleryItem {
  type: "image" | "video";
  src?: string;
  blurDataURL?: string;
  [key: string]: unknown;
}

interface Project {
  slug: string;
  heroImage?: string;
  heroBlur?: string;
  gallery?: GalleryItem[];
  [key: string]: unknown;
}

interface Content {
  projects: Project[];
  [key: string]: unknown;
}

async function generateBlurDataURL(imagePath: string): Promise<string> {
  const absolutePath = join(ROOT, "public", imagePath);
  const buffer = await sharp(absolutePath)
    .resize(10, 10, { fit: "inside" })
    .webp({ quality: 20 })
    .toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

async function main() {
  const content: Content = JSON.parse(readFileSync(CONTENT_PATH, "utf-8"));
  let count = 0;

  for (const project of content.projects) {
    // Hero image blur
    if (project.heroImage) {
      const blur = await generateBlurDataURL(project.heroImage);
      project.heroBlur = blur;
      count++;
      console.log(`  blur: ${project.heroImage}`);
    }

    // Gallery image blurs
    if (project.gallery) {
      for (const item of project.gallery) {
        if (item.type === "image" && item.src) {
          item.blurDataURL = await generateBlurDataURL(item.src);
          count++;
          console.log(`  blur: ${item.src}`);
        }
      }
    }
  }

  writeFileSync(CONTENT_PATH, JSON.stringify(content, null, 2) + "\n");
  console.log(`\nGenerated ${count} blur placeholders.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
