const JOST_BOLD_CSS = "https://fonts.googleapis.com/css2?family=Jost:wght@700&display=swap";
// A hung font host fails the image instead of holding the function until it times out
const FETCH_TIMEOUT_MS = 10_000;

/** Fetches Jost Bold as TTF for next/og: Satori cannot read the self-hosted woff2, and Google serves TTF to non-browser user agents. */
export async function loadJostBold(): Promise<ArrayBuffer> {
  const res = await fetch(JOST_BOLD_CSS, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Failed to load font CSS: ${res.status}`);
  const css = await res.text();
  const match = css.match(/src: url\((.+?)\)/);
  // Only follow a URL on Google's font host, whatever the stylesheet says
  if (!match?.[1]?.startsWith("https://fonts.gstatic.com/")) throw new Error("Failed to resolve font URL");
  const fontRes = await fetch(match[1], { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!fontRes.ok) throw new Error(`Failed to load font file: ${fontRes.status}`);
  return fontRes.arrayBuffer();
}
