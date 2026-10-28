import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// lib/content.ts imports one JSON file per locale from lib/content/
const CONTENT_DIR = join(ROOT, "lib", "content");
export const CONTENT_PATHS = readdirSync(CONTENT_DIR)
  .filter((file) => file.endsWith(".json"))
  .map((file) => join(CONTENT_DIR, file));
