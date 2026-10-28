import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { loadJostBold } from "@/lib/og-font";
import { defaultLocale, getContent, isValidLocale } from "@/lib/content";

const size = { width: 1200, height: 630 };

const contentFor = (locale: string) => getContent(isValidLocale(locale) ? locale : defaultLocale);

// A static `alt` export cannot vary by locale; generateImageMetadata can
export function generateImageMetadata({ params }: { params: { locale: string } }) {
  const content = contentFor(params.locale);
  return [
    {
      id: "default",
      alt: `${content.about.heading} | ${content.meta.title}`,
      size,
      contentType: "image/png",
    },
  ];
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Rendered on demand: an unknown locale 404s like the page
  if (!isValidLocale(locale)) notFound();
  const content = getContent(locale);
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
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Jost",
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: "-0.02em",
          }}
        >
          {content.about.heading}
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#a3a3a3",
            marginTop: 16,
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
          }}
        >
          {content.meta.title}
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
