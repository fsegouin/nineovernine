import { ImageResponse } from "next/og";

export const alt = "About — Nine Over Nine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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

export default async function Image() {
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
          About
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
