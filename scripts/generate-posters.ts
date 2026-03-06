import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CONTENT_PATH = join(ROOT, "lib", "content.json");

interface VideoRef {
  mp4?: string;
  webm?: string;
  poster?: string;
}

interface GalleryItem {
  type: "image" | "video";
  mp4?: string;
  webm?: string;
  poster?: string;
  [key: string]: unknown;
}

interface Project {
  slug: string;
  heroVideo?: VideoRef;
  cardVideo?: VideoRef;
  gallery?: GalleryItem[];
  [key: string]: unknown;
}

interface Content {
  projects: Project[];
  [key: string]: unknown;
}

function generatePoster(videoPath: string): string | null {
  const absolutePath = join(ROOT, "public", videoPath);
  if (!existsSync(absolutePath)) {
    console.warn(`  skip (missing): ${videoPath}`);
    return null;
  }

  const posterPath = videoPath.replace(/\.(mp4|webm)$/, "-poster.webp");
  const absolutePosterPath = join(ROOT, "public", posterPath);

  if (existsSync(absolutePosterPath)) {
    console.log(`  exists: ${posterPath}`);
    return posterPath;
  }

  try {
    execSync(
      `ffmpeg -y -i "${absolutePath}" -ss 0.5 -frames:v 1 -vf "scale='min(1280,iw)':-2" -c:v libwebp -quality 60 "${absolutePosterPath}"`,
      { stdio: "pipe" }
    );
    console.log(`  poster: ${posterPath}`);
    return posterPath;
  } catch {
    // If seeking to 0.5s fails (video shorter), try 0s
    try {
      execSync(
        `ffmpeg -y -i "${absolutePath}" -frames:v 1 -vf "scale='min(1280,iw)':-2" -c:v libwebp -quality 60 "${absolutePosterPath}"`,
        { stdio: "pipe" }
      );
      console.log(`  poster (t=0): ${posterPath}`);
      return posterPath;
    } catch (err) {
      console.error(`  failed: ${videoPath}`, err);
      return null;
    }
  }
}

function main() {
  const content: Content = JSON.parse(readFileSync(CONTENT_PATH, "utf-8"));
  let count = 0;

  for (const project of content.projects) {
    // Hero video poster
    if (project.heroVideo?.mp4) {
      const poster = generatePoster(project.heroVideo.mp4);
      if (poster) {
        project.heroVideo.poster = poster;
        count++;
      }
    }

    // Card video poster (use same poster as hero if same video)
    if (project.cardVideo?.mp4) {
      if (project.cardVideo.mp4 === project.heroVideo?.mp4 && project.heroVideo?.poster) {
        project.cardVideo.poster = project.heroVideo.poster;
      } else {
        const poster = generatePoster(project.cardVideo.mp4);
        if (poster) {
          project.cardVideo.poster = poster;
          count++;
        }
      }
    }

    // Gallery video posters
    if (project.gallery) {
      for (const item of project.gallery) {
        if (item.type === "video" && item.mp4) {
          const poster = generatePoster(item.mp4);
          if (poster) {
            item.poster = poster;
            count++;
          }
        }
      }
    }
  }

  writeFileSync(CONTENT_PATH, JSON.stringify(content, null, 2) + "\n");
  console.log(`\nGenerated ${count} video posters.`);
}

main();
