import { FadeIn } from "@/components/FadeIn";
import { TextReveal } from "@/components/TextReveal";
import content from "@/lib/content.json";

const { heading, founder, vision, values } = content.about;

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="px-6 pb-24 pt-32 lg:px-12 lg:pb-32 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              <TextReveal>{heading}</TextReveal>
            </h1>
          </FadeIn>
        </div>
      </section>

      {/* Founder */}
      <section className="border-t border-border px-6 py-24 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <FadeIn className="lg:col-span-5">
              <div className="aspect-[3/4] w-full bg-muted/20" />
            </FadeIn>

            <FadeIn className="lg:col-span-7" delay={0.15}>
              <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
                {founder.overline}
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
                {founder.name}
              </h2>
              <p className="mt-2 font-sans text-sm text-muted">
                {founder.role}
              </p>

              <div className="mt-8 space-y-5">
                {founder.paragraphs.map((text, i) => (
                  <p key={i} className="font-sans text-base leading-relaxed text-muted">
                    {text}
                  </p>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Vision */}
      <section className="px-6 py-24 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn direction="none">
            <blockquote className="font-display text-3xl font-light leading-snug tracking-tight md:text-4xl">
              &ldquo;{vision.quote}&rdquo;
            </blockquote>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mt-10 space-y-5 text-left">
              {vision.paragraphs.map((text, i) => (
                <p key={i} className="font-sans text-base leading-relaxed text-muted">
                  {text}
                </p>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-border px-6 py-24 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
              {values.overline}
            </p>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
              {values.heading}
            </h2>
          </FadeIn>

          <div className="mt-16 grid grid-cols-1 gap-0 md:grid-cols-3 md:gap-12">
            {values.items.map((value, i) => (
              <FadeIn key={value.number} delay={i * 0.1}>
                <div className="border-t border-border py-8">
                  <span className="font-sans text-xs text-muted">
                    {value.number}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
                    {value.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
                    {value.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
