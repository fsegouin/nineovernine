import { FadeIn } from "./FadeIn";

export function PhilosophySection() {
  return (
    <section className="bg-foreground px-6 py-24 text-background lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-12">
          <FadeIn className="lg:col-span-7" direction="none">
            <blockquote className="font-display text-3xl font-light leading-snug tracking-tight md:text-4xl lg:text-5xl">
              &ldquo;We believe the best digital experiences emerge from the
              intersection of human intuition and artificial
              intelligence.&rdquo;
            </blockquote>
          </FadeIn>

          <FadeIn className="lg:col-span-5" delay={0.2}>
            <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-background/40">
              Our Approach
            </p>
            <p className="mt-6 font-sans text-base leading-relaxed text-background/70">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
              ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
              aliquip ex ea commodo consequat.
            </p>
            <p className="mt-4 font-sans text-base leading-relaxed text-background/70">
              Duis aute irure dolor in reprehenderit in voluptate velit esse
              cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
              cupidatat non proident.
            </p>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
