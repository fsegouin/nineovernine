import { FadeIn } from "./FadeIn";

export function ContactSection() {
  return (
    <section id="contact" className="border-t border-border px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl text-center">
        <FadeIn>
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Get in Touch
          </p>
          <h2 className="mt-6 font-display text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Let&apos;s build something
            <br />
            together.
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <a
            href="mailto:hello@nineovernine.com"
            className="mt-10 inline-block font-sans text-xl text-muted underline decoration-border underline-offset-8 transition-colors hover:text-foreground hover:decoration-foreground md:text-2xl"
          >
            hello@nineovernine.com
          </a>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="mt-8 font-sans text-sm text-muted">
            London / Worldwide
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
