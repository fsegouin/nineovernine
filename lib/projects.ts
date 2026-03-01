export interface Project {
  slug: string;
  title: string;
  category: string;
  year: string;
  description: string;
  aspectClass: string;
  bgClass: string;
}

export const projects: Project[] = [
  {
    slug: "project-alpha",
    title: "Project Alpha",
    category: "Brand Identity",
    year: "2024",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    aspectClass: "aspect-[4/3]",
    bgClass: "bg-muted/20",
  },
  {
    slug: "project-beta",
    title: "Project Beta",
    category: "Digital Platform",
    year: "2024",
    description:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.",
    aspectClass: "aspect-[3/4]",
    bgClass: "bg-muted/30",
  },
  {
    slug: "project-gamma",
    title: "Project Gamma",
    category: "AI Experience",
    year: "2025",
    description:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.",
    aspectClass: "aspect-[3/4]",
    bgClass: "bg-muted/10",
  },
  {
    slug: "project-delta",
    title: "Project Delta",
    category: "Product Design",
    year: "2025",
    description:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.",
    aspectClass: "aspect-[4/3]",
    bgClass: "bg-muted/20",
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}

export function getNextProject(slug: string) {
  const index = projects.findIndex((p) => p.slug === slug);
  return projects[(index + 1) % projects.length];
}
