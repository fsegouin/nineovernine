import type { Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConsoleMessage } from "@/components/ConsoleMessage";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${jost.variable} ${inter.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.classList.add(t);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].remove();var n=document.createElement("meta");n.name="theme-color";n.content=t==="dark"?"#0a0a0a":"#fafafa";document.head.appendChild(n)}}catch(e){}})()`,
          }}
        />
        {children}
        <ConsoleMessage />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
