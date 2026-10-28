import localFont from "next/font/local";

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

export const fontVariables = `${jost.variable} ${inter.variable}`;
