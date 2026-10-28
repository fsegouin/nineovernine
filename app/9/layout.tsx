import { Analytics } from "@vercel/analytics/next";
import { MotionPreferences } from "@/components/MotionPreferences";
import { fontVariables } from "@/lib/fonts";
import { THEME_SCRIPT } from "@/lib/document";
import "../globals.css";

export { viewport } from "@/lib/document";

// /9 sits outside app/[locale], so it is its own root layout
export default function NineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontVariables} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <MotionPreferences>{children}</MotionPreferences>
        <Analytics />
      </body>
    </html>
  );
}
