import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProjectTransitionProvider } from "@/components/ProjectTransition";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Cursor } from "@/components/Cursor";
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

export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jost.variable} ${inter.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.classList.add(t);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].remove();var n=document.createElement("meta");n.name="theme-color";n.content=t==="dark"?"#0a0a0a":"#fafafa";document.head.appendChild(n)}}catch(e){}})()`,
          }}
        />
        {/* Grain overlay — regular div instead of body::before to avoid
            breaking Safari iOS 26 tab-tinting */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-100 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
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
      </body>
    </html>
  );
}
