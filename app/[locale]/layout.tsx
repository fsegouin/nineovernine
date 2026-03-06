import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
import { organizationJsonLd, webSiteJsonLd } from "@/lib/jsonld";
import { getContent, supportedLocales, isValidLocale } from "@/lib/content";
import type { Locale } from "@/lib/content";

export function generateStaticParams() {
  return supportedLocales.map((locale) => ({ locale }));
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nineovernine.com";

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
      template: `%s — ${content.meta.title}`,
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

  const typedLocale = locale as Locale;

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="${typedLocale}"`,
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd(typedLocale)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteJsonLd(typedLocale)),
        }}
      />
      <GrainOverlay />
      <ThemeProvider>
        <PartyModeProvider>
          <LocaleProvider locale={typedLocale}>
            <EntranceProvider>
              <SmoothScroll>
                <ProjectTransitionProvider>
                  <Navigation />
                  <main>{children}</main>
                  <Footer />
                </ProjectTransitionProvider>
              </SmoothScroll>
              <Cursor />
            </EntranceProvider>
          </LocaleProvider>
        </PartyModeProvider>
      </ThemeProvider>
    </>
  );
}
