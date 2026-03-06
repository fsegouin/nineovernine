import { notFound } from "next/navigation";
import { getProject, getNextProject, projects } from "@/lib/projects";
import { projectJsonLd } from "@/lib/jsonld";
import { ProjectContent } from "@/components/ProjectContent";
import { isValidLocale } from "@/lib/content";
import type { Locale } from "@/lib/content";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const typedLocale = isValidLocale(locale) ? locale : "en";
  const project = getProject(slug, typedLocale as Locale);
  if (!project) return {};
  return {
    title: project.title,
    description: project.description,
    openGraph: {
      type: "article",
      title: project.title,
      description: project.description,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();

  const project = getProject(slug, locale);
  if (!project) notFound();

  const nextProject = getNextProject(slug, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(projectJsonLd(project, locale)),
        }}
      />
      <ProjectContent project={project} nextProject={nextProject} />
    </>
  );
}
