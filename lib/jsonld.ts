import type { Project } from "./projects";
import { getContent, defaultLocale } from "./content";
import type { Locale } from "./content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nineovernine.com";

export function organizationJsonLd(locale: Locale = defaultLocale) {
  const content = getContent(locale);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: content.meta.title,
    url: siteUrl,
    description: content.meta.description,
    contactPoint: {
      "@type": "ContactPoint",
      email: content.contact.email,
      contactType: "customer service",
    },
  };
}

export function webSiteJsonLd(locale: Locale = defaultLocale) {
  const content = getContent(locale);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: content.meta.title,
    url: siteUrl,
  };
}

export function projectJsonLd(project: Project, locale: Locale = defaultLocale) {
  const content = getContent(locale);
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.description,
    datePublished: project.year,
    url: `${siteUrl}/${locale}/projects/${project.slug}`,
    creator: {
      "@type": "Organization",
      name: content.meta.title,
    },
    ...(project.heroImage && { image: `${siteUrl}${project.heroImage}` }),
  };
}
