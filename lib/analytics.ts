import { track } from "@vercel/analytics";
import type { Locale } from "@/lib/content";

// The event catalogue. Properties never carry what a visitor typed (name, email,
// message) or the email address itself. The page URL already records the locale.
type Events = {
  // 1-based number of the step just completed
  contact_step: { step: number };
  contact_submitted: { services: number };
  contact_failed: { status: number | null };
  project_opened: { slug: string; source: "work" | "next" };
  language_switched: { to: Locale };
  email_link_clicked: { location: "contact" | "footer" };
  client_link_clicked: { slug: string };
};

export function trackEvent<Name extends keyof Events>(name: Name, properties: Events[Name]) {
  track(name, properties);
}
