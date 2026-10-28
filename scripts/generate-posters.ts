import { execFileSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, statSync, rmSync } from "fs";
import { join } from "path";
import { CONTENT_PATHS, ROOT } from "./content-paths";

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

/** Runs ffmpeg with an argument list (no shell), so paths are never parsed as shell syntax. */
function extractFrame(input: string, output: string, seek?: string) {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i", input,
      ...(seek ? ["-ss", seek] : []),
      "-frames:v", "1",
      "-vf", "scale='min(1280,iw)':-2",
      "-c:v", "libwebp",
      "-quality", "60",
      output,
    ],
    { stdio: "pipe" }
  );
  // ffmpeg exits 0 when a seek lands past the end ("Output file is empty"), so check for
  // a frame here; an empty file left behind would also pass the "exists" check next run
  if (!existsSync(output) || statSync(output).size === 0) {
    rmSync(output, { force: true });
    throw new Error(`No frame extracted from ${input}`);
  }
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
    extractFrame(absolutePath, absolutePosterPath, "0.5");
    console.log(`  poster: ${posterPath}`);
    return posterPath;
  } catch {
    // If seeking to 0.5s fails (video shorter), try 0s
    try {
      extractFrame(absolutePath, absolutePosterPath);
      console.log(`  poster (t=0): ${posterPath}`);
      return posterPath;
    } catch (err) {
      console.error(`  failed: ${videoPath}`, err);
      return null;
    }
  }
}

function main() {
  let count = 0;

  for (const contentPath of CONTENT_PATHS) {
    const content: Content = JSON.parse(readFileSync(contentPath, "utf-8"));

    for (const project of content.projects) {
      if (project.heroVideo?.mp4) {
        const poster = generatePoster(project.heroVideo.mp4);
        if (poster) {
          project.heroVideo.poster = poster;
          count++;
        }
      }

      // Reuse the hero poster when the card plays the same video
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

    writeFileSync(contentPath, JSON.stringify(content, null, 2) + "\n");
  }

  console.log(`\nSet ${count} video poster references across ${CONTENT_PATHS.length} content files.`);
}

main();
