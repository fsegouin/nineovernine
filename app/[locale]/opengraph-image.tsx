import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { loadJostBold } from "@/lib/og-font";
import { getContent, isValidLocale } from "@/lib/content";

export const alt = "Nine Over Nine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Rendered on demand: an unknown locale 404s like the page
  if (!isValidLocale(locale)) notFound();
  const { description } = getContent(locale).meta;
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
            fontSize: 120,
            fontWeight: 700,
            color: "#fafafa",
            letterSpacing: "-0.02em",
          }}
        >
          9/9
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#a3a3a3",
            marginTop: 16,
            letterSpacing: "0.1em",
          }}
        >
          {description}
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
