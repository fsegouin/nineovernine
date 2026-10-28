import { Analytics } from "@vercel/analytics/next";
import { NotFoundContent } from "@/components/NotFoundContent";
import { fontVariables } from "@/lib/fonts";
import { THEME_SCRIPT } from "@/lib/document";
import "./globals.css";

export { viewport } from "@/lib/document";

// The root layouts sit under app/[locale] and app/9, so there is no root
// not-found.js to compose a 404 from; Next renders this standalone document.
export default function GlobalNotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontVariables} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <NotFoundContent />
        <Analytics />
      </body>
    </html>
  );
}
