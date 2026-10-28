import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/projects";
import { defaultLocale, getContent, isValidLocale } from "@/lib/content";
import { loadJostBold } from "@/lib/og-font";

const size = { width: 1200, height: 630 };

// No generateStaticParams here: with generateImageMetadata, Next generates the
// route's own (one per image id), and a second export would collide with it.

// A static `alt` export cannot name the project; generateImageMetadata can
export function generateImageMetadata({ params }: { params: { locale: string; slug: string } }) {
  const locale = isValidLocale(params.locale) ? params.locale : defaultLocale;
  const project = getProject(params.slug, locale);
  // No metadata for an unknown slug: Next then 404s the image route itself
  if (!project) return [];
  return [
    {
      id: "default",
      alt: `${project.title} | ${getContent(locale).meta.title}`,
      size,
      contentType: "image/png",
    },
  ];
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  // Unknown locales and slugs 404 like the project page
  if (!isValidLocale(locale)) notFound();
  const project = getProject(slug, locale);
  if (!project) notFound();
  const fontData = await loadJostBold();

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: 80,
          fontFamily: "Jost",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 16,
            color: "#a3a3a3",
            letterSpacing: "0.2em",
            textTransform: "uppercase" as const,
            marginBottom: 16,
          }}
        >
          {`${project.category} — ${project.year}`}
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          {project.title}
        </div>
        <div
          style={{
            fontSize: 16,
            color: "#a3a3a3",
            marginTop: 32,
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
          }}
        >
          Nine Over Nine
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Jost",
          data: fontData,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}
