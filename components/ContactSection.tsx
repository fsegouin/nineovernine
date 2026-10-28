import { FadeIn } from "./FadeIn";
import { Magnetic } from "./Magnetic";
import { ContactForm } from "./ContactForm";
import { EmailLink } from "./EmailLink";
import { getContent } from "@/lib/content";
import type { Locale } from "@/lib/content";

export function ContactSection({ locale }: { locale: Locale }) {
  const { overline, heading, email, location, form } = getContent(locale).contact;
  return (
    <section id="contact" className="border-t border-border px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl text-center">
        <FadeIn>
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
            {overline}
          </p>
          <h2 className="mt-6 font-display text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            {heading.split("\n").map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <ContactForm />
        </FadeIn>

        <FadeIn delay={0.4}>
          <p className="mt-10 font-sans text-xs text-muted">
            {form.orEmailLabel}
          </p>
          <Magnetic strength={0.15} className="mt-2 inline-block">
            <EmailLink
              email={email}
              location="contact"
              className="inline-block font-sans text-base text-muted underline decoration-border underline-offset-8 transition-colors hover:text-foreground hover:decoration-foreground md:text-lg"
            />
          </Magnetic>
        </FadeIn>

        <FadeIn delay={0.5}>
          <p className="mt-6 font-sans text-sm text-muted">
            {location}
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
