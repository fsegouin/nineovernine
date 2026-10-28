"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/content";
import { defaultLocale } from "@/lib/content";

const LocaleContext = createContext<Locale>(defaultLocale);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext value={locale}>{children}</LocaleContext>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
