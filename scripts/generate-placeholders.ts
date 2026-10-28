import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { CONTENT_PATHS, ROOT } from "./content-paths";

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
  // Locales share images, so each placeholder is computed once
  const blurCache = new Map<string, string>();
  const blurFor = async (imagePath: string) => {
    let blur = blurCache.get(imagePath);
    if (!blur) {
      blur = await generateBlurDataURL(imagePath);
      blurCache.set(imagePath, blur);
      console.log(`  blur: ${imagePath}`);
    }
    return blur;
  };
  let count = 0;

  for (const contentPath of CONTENT_PATHS) {
    const content: Content = JSON.parse(readFileSync(contentPath, "utf-8"));

    for (const project of content.projects) {
      if (project.heroImage) {
        project.heroBlur = await blurFor(project.heroImage);
        count++;
      }

      if (project.gallery) {
        for (const item of project.gallery) {
          if (item.type === "image" && item.src) {
            item.blurDataURL = await blurFor(item.src);
            count++;
          }
        }
      }
    }

    writeFileSync(contentPath, JSON.stringify(content, null, 2) + "\n");
  }

  console.log(`\nSet ${count} blur placeholders across ${CONTENT_PATHS.length} content files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
