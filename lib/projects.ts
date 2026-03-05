import { getContent, defaultLocale } from "./content";
import type { Locale } from "./content";

export interface GalleryItem {
  type: "image" | "video";
  src?: string;
  blurDataURL?: string;
  mp4?: string;
  webm?: string;
  poster?: string;
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
  heroBlur?: string;
  heroVideo?: { mp4: string; webm: string; poster?: string };
  cardVideo?: { mp4: string; webm: string; poster?: string };
  gallery?: GalleryItem[];
  role?: string;
  agency?: string;
  client?: string;
  credit?: string;
  clientUrl?: string;
}

export function getProjects(locale: Locale = defaultLocale): Project[] {
  return getContent(locale).projects as Project[];
}

export function getProject(slug: string, locale: Locale = defaultLocale) {
  return getProjects(locale).find((p) => p.slug === slug);
}

export function getNextProject(slug: string, locale: Locale = defaultLocale) {
  const all = getProjects(locale);
  const index = all.findIndex((p) => p.slug === slug);
  return all[(index + 1) % all.length];
}

// Default English projects for generateStaticParams and OG images
export const projects = getProjects(defaultLocale);
