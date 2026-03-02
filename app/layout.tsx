import type { Metadata } from "next";
import localFont from "next/font/local";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProjectTransitionProvider } from "@/components/ProjectTransition";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Cursor } from "@/components/Cursor";
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

export const metadata: Metadata = {
  title: "Nine Over Nine",
  description: "A human-led digital agency built for the AI world.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#fafafa" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches);if(t==="light"||t==="dark")document.documentElement.classList.add(t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=d?"#0a0a0a":"#fafafa"}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${jost.variable} ${inter.variable} antialiased`}
      >
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
