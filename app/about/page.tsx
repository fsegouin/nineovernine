import { FadeIn } from "@/components/FadeIn";
import { TextReveal } from "@/components/TextReveal";

const values = [
  {
    number: "01",
    title: "Craft",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    number: "02",
    title: "Clarity",
    description:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    number: "03",
    title: "Conviction",
    description:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="px-6 pb-24 pt-32 lg:px-12 lg:pb-32 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              <TextReveal>About</TextReveal>
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
                The Founder
              </p>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
                [Founder Name]
              </h2>
              <p className="mt-2 font-sans text-sm text-muted">
                Founder & Creative Director
              </p>

              <div className="mt-8 space-y-5">
                <p className="font-sans text-base leading-relaxed text-muted">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat.
                </p>
                <p className="font-sans text-base leading-relaxed text-muted">
                  Duis aute irure dolor in reprehenderit in voluptate velit esse
                  cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                  cupidatat non proident, sunt in culpa qui officia deserunt
                  mollit anim id est laborum.
                </p>
                <p className="font-sans text-base leading-relaxed text-muted">
                  Sed ut perspiciatis unde omnis iste natus error sit voluptatem
                  accusantium doloremque laudantium, totam rem aperiam, eaque
                  ipsa quae ab illo inventore veritatis et quasi architecto
                  beatae vitae dicta sunt explicabo.
                </p>
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
              &ldquo;Craftsmanship in the age of algorithms.&rdquo;
            </blockquote>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="mt-10 space-y-5 text-left">
              <p className="font-sans text-base leading-relaxed text-muted">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
                enim ad minim veniam, quis nostrud exercitation ullamco laboris
                nisi ut aliquip ex ea commodo consequat.
              </p>
              <p className="font-sans text-base leading-relaxed text-muted">
                Duis aute irure dolor in reprehenderit in voluptate velit esse
                cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
                cupidatat non proident, sunt in culpa qui officia deserunt
                mollit anim id est laborum.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Values */}
      <section className="border-t border-border px-6 py-24 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <FadeIn>
            <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
              What Drives Us
            </p>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Values
            </h2>
          </FadeIn>

          <div className="mt-16 grid grid-cols-1 gap-0 md:grid-cols-3 md:gap-12">
            {values.map((value, i) => (
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
