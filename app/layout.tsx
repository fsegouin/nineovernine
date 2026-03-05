import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProjectTransitionProvider } from "@/components/ProjectTransition";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Cursor } from "@/components/Cursor";
import { GrainOverlay } from "@/components/GrainOverlay";
import { ConsoleMessage } from "@/components/ConsoleMessage";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/jsonld";
import content from "@/lib/content.json";
import "./globals.css";

const jost = localFont({
  src: "../public/fonts/jost-latin-wght-normal.woff2",
  variable: "--font-jost",
  weight: "100 900",
});

const inter = localFont({
  src: "../public/fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nineovernine.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: content.meta.title,
    template: `%s — ${content.meta.title}`,
  },
  description: content.meta.description,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: content.meta.title,
    title: content.meta.title,
    description: content.meta.description,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webSiteJsonLd()),
          }}
        />
      </head>
      <body
        className={`${jost.variable} ${inter.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.classList.add(t);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].remove();var n=document.createElement("meta");n.name="theme-color";n.content=t==="dark"?"#0a0a0a":"#fafafa";document.head.appendChild(n)}}catch(e){}})()`,
          }}
        />
        <GrainOverlay />
        <ThemeProvider>
          <SmoothScroll>
            <ProjectTransitionProvider>
              <Navigation />
              <main>{children}</main>
              <Footer />
            </ProjectTransitionProvider>
          </SmoothScroll>
          <Cursor />
        </ThemeProvider>
        <ConsoleMessage />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
