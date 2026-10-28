import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConsoleMessage } from "@/components/ConsoleMessage";
import { MotionPreferences } from "@/components/MotionPreferences";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProjectTransitionProvider } from "@/components/ProjectTransition";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Cursor } from "@/components/Cursor";
import { GrainOverlay } from "@/components/GrainOverlay";
import { PartyModeProvider } from "@/components/PartyMode";
import { LocaleProvider } from "@/components/LocaleProvider";
import { EntranceProvider } from "@/components/EntranceProvider";
import { organizationJsonLd, serializeJsonLd, webSiteJsonLd } from "@/lib/jsonld";
import { getContent, supportedLocales, isValidLocale } from "@/lib/content";
import { siteUrl } from "@/lib/site";
import { fontVariables } from "@/lib/fonts";
import { ENTRANCE_SCRIPT, THEME_SCRIPT } from "@/lib/document";
import "../globals.css";

export { viewport } from "@/lib/document";

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

// Only the generated locales match; any other first segment is an unmatched URL
// and gets app/global-not-found.tsx (a notFound() thrown while rendering under a
// dynamic root layout has no root not-found.js to fall back to).
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  const content = getContent(locale);
  const ogLocale = locale === "fr" ? "fr_FR" : "en_US";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: content.meta.title,
      template: `%s | ${content.meta.title}`,
    },
    description: content.meta.description,
    openGraph: {
      type: "website",
      locale: ogLocale,
      siteName: content.meta.title,
      title: content.meta.title,
      description: content.meta.description,
    },
    twitter: {
      card: "summary_large_image",
    },
    alternates: {
      languages: Object.fromEntries(
        supportedLocales.map((l) => [l, `/${l}`])
      ),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const { skipLink } = getContent(locale).nav;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${fontVariables} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: ENTRANCE_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(organizationJsonLd(locale)),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(webSiteJsonLd(locale)),
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:text-background"
        >
          {skipLink}
        </a>
        <GrainOverlay />
        <MotionPreferences>
          <ThemeProvider>
            <LocaleProvider locale={locale}>
              <PartyModeProvider>
                <EntranceProvider>
                  <SmoothScroll>
                    <ProjectTransitionProvider>
                      <Navigation />
                      <main id="main" tabIndex={-1} className="outline-none">
                        {children}
                      </main>
                      <Footer buildYear={new Date().getFullYear()} />
                    </ProjectTransitionProvider>
                  </SmoothScroll>
                  <Cursor />
                </EntranceProvider>
              </PartyModeProvider>
            </LocaleProvider>
          </ThemeProvider>
        </MotionPreferences>
        <ConsoleMessage />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
