import { getContent, supportedLocales } from "./content";

// Shared by the contact form (input maxLength) and the API route (validation)
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 200;
// Longest valid address (RFC 5321 path limit minus the angle brackets)
export const MAX_EMAIL_LENGTH = 254;
export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 10_000;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Every value the form's service chips can send, across all locales. */
export const SERVICE_OPTIONS: ReadonlySet<string> = new Set(
  supportedLocales.flatMap((locale) =>
    getContent(locale).contact.form.steps.flatMap((step) => step.options ?? []),
  ),
);
