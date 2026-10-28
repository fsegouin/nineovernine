"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "./LocaleProvider";
import { getContent, supportedLocales } from "@/lib/content";
import type { Locale } from "@/lib/content";
import { trackEvent } from "@/lib/analytics";

// One year: the proxy reads this cookie to remember the choice on later visits
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function persistLocale(locale: Locale) {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};samesite=lax`;
}

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

    persistLocale(newLocale);
    trackEvent("language_switched", { to: newLocale });

    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <div role="group" aria-label={getContent(locale).nav.languageLabel} className="flex items-center gap-1 font-sans text-xs tracking-wide">
      {supportedLocales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted" aria-hidden="true">/</span>}
          <button
            type="button"
            lang={l}
            aria-current={l === locale ? "true" : undefined}
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
