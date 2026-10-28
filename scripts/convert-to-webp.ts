import sharp from "sharp";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import { join, sep } from "path";
import { CONTENT_PATHS, ROOT } from "./content-paths";

const PUBLIC_DIR = join(ROOT, "public");

/** Resolves a content image path inside public/, refusing one that climbs out of it. */
function publicPath(src: string): string {
  const path = join(PUBLIC_DIR, src);
  if (!path.startsWith(PUBLIC_DIR + sep)) throw new Error(`Image path escapes public/: ${src}`);
  return path;
}

async function main() {
  // Every locale file points at the same images: rewrite the references in all of
  // them, but convert and delete each source image only once.
  const conversions = new Map<string, string>();
  const updatedFiles: { path: string; content: unknown }[] = [];

  for (const contentPath of CONTENT_PATHS) {
    const content = JSON.parse(readFileSync(contentPath, "utf-8"));
    let changed = false;

    for (const project of content.projects) {
      if (project.gallery) {
        for (const item of project.gallery) {
          if (item.type === "image" && item.src && !item.src.endsWith(".webp")) {
            const oldSrc = item.src as string;
            const newSrc = oldSrc.replace(/\.(png|jpg|jpeg)$/i, ".webp");
            conversions.set(oldSrc, newSrc);
            item.src = newSrc;
            changed = true;
          }
        }
      }
    }

    if (changed) updatedFiles.push({ path: contentPath, content });
  }

  // Convert everything, then point the content files at the WebP copies, and only
  // then delete the sources: a failed conversion leaves every reference valid.
  for (const [oldPath, newPath] of conversions) {
    await sharp(publicPath(oldPath)).webp({ quality: 85 }).toFile(publicPath(newPath));
    console.log(`  converted: ${oldPath} -> ${newPath}`);
  }

  for (const { path, content } of updatedFiles) {
    writeFileSync(path, JSON.stringify(content, null, 2) + "\n");
  }

  for (const oldPath of conversions.keys()) {
    unlinkSync(publicPath(oldPath));
  }
  console.log(`\nConverted ${conversions.size} images to WebP.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
