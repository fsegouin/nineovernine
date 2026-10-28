import { notFound } from "next/navigation";
import { getProject, getNextProject, projects } from "@/lib/projects";
import { projectJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { ProjectContent } from "@/components/ProjectContent";
import { defaultLocale, getContent, isValidLocale, supportedLocales } from "@/lib/content";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

// Unknown slugs are unmatched URLs, so they get app/global-not-found.tsx
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const typedLocale = isValidLocale(locale) ? locale : defaultLocale;
  const project = getProject(slug, typedLocale);
  if (!project) return {};
  return {
    title: project.title,
    description: project.description,
    // openGraph and alternates replace the layout's values wholesale, so
    // restate the layout's fields and point hreflang at this page.
    openGraph: {
      type: "article",
      locale: typedLocale === "fr" ? "fr_FR" : "en_US",
      siteName: getContent(typedLocale).meta.title,
      title: project.title,
      description: project.description,
    },
    alternates: {
      languages: Object.fromEntries(
        supportedLocales.map((l) => [l, `/${l}/projects/${slug}`])
      ),
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
          __html: serializeJsonLd(projectJsonLd(project, locale)),
        }}
      />
      <ProjectContent project={project} nextProject={nextProject} />
    </>
  );
}
