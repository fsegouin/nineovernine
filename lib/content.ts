import en from "./content/en.json";
import fr from "./content/fr.json";

const locales = { en, fr } as const;

export type Locale = keyof typeof locales;
export type Content = typeof en;

export const defaultLocale: Locale = "en";
export const supportedLocales: Locale[] = ["en", "fr"];

export function getContent(locale: Locale): Content {
  return locales[locale] ?? locales[defaultLocale];
}

export function isValidLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}
