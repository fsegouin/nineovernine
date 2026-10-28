import { NextRequest, NextResponse } from "next/server";
import { supportedLocales, defaultLocale, isValidLocale } from "./lib/content";
import type { Locale } from "./lib/content";

const STATIC_FILE_RE = /\.\w+$/;

function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const preferred = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.split("-")[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of preferred) {
    if (isValidLocale(lang)) return lang;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal Next.js paths, static files, API routes, and the /9 easter egg
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/9" ||
    STATIC_FILE_RE.test(pathname)
  ) {
    return;
  }

  // Check if pathname already has a supported locale
  const hasLocale = supportedLocales.some(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  );
  if (hasLocale) return;

  // Determine preferred locale
  const preferred =
    request.cookies.get("NEXT_LOCALE")?.value ||
    negotiateLocale(request.headers.get("accept-language"));
  // An invalid cookie falls back to the default rather than being negotiated
  const locale = isValidLocale(preferred) ? preferred : defaultLocale;

  // Redirect to locale-prefixed URL
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|fonts|9$|projects/.*\\..+|.*\\..*).*)"],
};
