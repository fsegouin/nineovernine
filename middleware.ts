import { NextRequest, NextResponse } from "next/server";
import { supportedLocales, defaultLocale } from "./lib/content";

function negotiateLocale(acceptLanguage: string | null): string {
  if (!acceptLanguage) return defaultLocale;
  const preferred = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.split("-")[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of preferred) {
    if (supportedLocales.includes(lang as typeof supportedLocales[number])) {
      return lang;
    }
  }
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal Next.js paths, static files, API routes, and the /9 easter egg
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/9" ||
    pathname.startsWith("/projects/") && pathname.match(/\.\w+$/) ||
    pathname.match(/\.\w+$/)
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
    negotiateLocale(request.headers.get("accept-language")) ||
    defaultLocale;

  const locale = supportedLocales.includes(preferred as typeof supportedLocales[number])
    ? preferred
    : defaultLocale;

  // Redirect to locale-prefixed URL
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|fonts|9$|projects/.*\\..+|.*\\..*).*)"],
};
