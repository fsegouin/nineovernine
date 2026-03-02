import content from "./content.json";

export interface GalleryItem {
  type: "image" | "video";
  src?: string;
  mp4?: string;
  webm?: string;
  layout: "full" | "half";
  position?: "left" | "center" | "right";
}

export interface Project {
  slug: string;
  title: string;
  category: string;
  year: string;
  description: string;
  aspectClass: string;
  bgClass: string;
  imageUrl?: string;
  heroImage?: string;
  heroVideo?: { mp4: string; webm: string };
  cardVideo?: { mp4: string; webm: string };
  gallery?: GalleryItem[];
  role?: string;
  agency?: string;
  client?: string;
  credit?: string;
  clientUrl?: string;
}

export const projects = content.projects as Project[];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export function getNextProject(slug: string) {
  const index = projects.findIndex((p) => p.slug === slug);
  return projects[(index + 1) % projects.length];
}
