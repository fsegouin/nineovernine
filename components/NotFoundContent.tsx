"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { defaultLocale, getContent, isValidLocale } from "@/lib/content";
import type { Locale } from "@/lib/content";

// The global 404 gets no route params; the proxy puts a locale at the start of
// every page URL, so the first path segment names it.
function getPathLocale(): Locale {
  const segment = window.location.pathname.split("/")[1] ?? "";
  return isValidLocale(segment) ? segment : defaultLocale;
}

const subscribe = () => () => {};
const getServerLocale = (): Locale => defaultLocale;

export function NotFoundContent() {
  const locale = useSyncExternalStore(subscribe, getPathLocale, getServerLocale);
  const { meta, notFound } = getContent(locale);
  const { title, overline, heading, message, backLabel } = notFound;

  // The global 404 document is static and declares lang="en"
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <main className="flex min-h-svh items-center px-6 lg:px-12">
      {/* Rendered here rather than as metadata so it follows the URL's locale; React hoists it into <head> */}
      <title>{`${title} | ${meta.title}`}</title>
      <div className="mx-auto w-full max-w-7xl">
        <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
          {overline}
        </p>
        <h1 className="mt-4 font-display text-5xl font-bold tracking-tight md:text-7xl">
          {heading}
        </h1>
        <p className="mt-6 max-w-lg font-sans text-lg leading-relaxed text-muted">
          {message}
        </p>
        <Link
          href={`/${locale}`}
          className="mt-10 inline-block font-sans text-sm text-muted underline underline-offset-4 transition-colors hover:text-foreground"
        >
          <span aria-hidden="true">&larr;</span> {backLabel}
        </Link>
      </div>
    </main>
  );
}
