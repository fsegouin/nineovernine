import { ImageResponse } from "next/og";
import { getProject, projects } from "@/lib/projects";

export const alt = "Project — Nine Over Nine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

async function loadFont() {
  const res = await fetch(
    "https://fonts.googleapis.com/css2?family=Jost:wght@700&display=swap"
  );
  const css = await res.text();
  const match = css.match(/src: url\((.+?)\)/);
  if (!match?.[1]) throw new Error("Failed to resolve font URL");
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  const fontData = await loadFont();

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
          {`${project?.category ?? "Project"} — ${project?.year ?? ""}`}
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
          {project?.title ?? slug}
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
