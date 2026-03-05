"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "./LocaleProvider";
import { supportedLocales } from "@/lib/content";
import type { Locale } from "@/lib/content";

const localeLabels: Record<Locale, string> = {
  en: "EN",
  fr: "FR",
};

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Set cookie for middleware to remember preference
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;

    // Replace current locale in pathname
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <div className="flex items-center gap-1 font-sans text-xs tracking-wide">
      {supportedLocales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted">/</span>}
          <button
            onClick={() => switchLocale(l)}
            className={`transition-colors ${
              l === locale
                ? "text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {localeLabels[l]}
          </button>
        </span>
      ))}
    </div>
  );
}
