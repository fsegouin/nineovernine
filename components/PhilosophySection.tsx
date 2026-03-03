import { FadeIn } from "./FadeIn";
import content from "@/lib/content.json";

const { quote, label, paragraphs } = content.philosophy;

export function PhilosophySection() {
  return (
    <section className="bg-grain bg-foreground px-6 py-24 text-background lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-12">
          <FadeIn className="lg:col-span-7" direction="none">
            <blockquote className="font-display text-3xl font-light leading-snug tracking-tight md:text-4xl lg:text-5xl">
              &ldquo;{quote}&rdquo;
            </blockquote>
          </FadeIn>

          <FadeIn className="lg:col-span-5" delay={0.2}>
            <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-background/40">
              {label}
            </p>
            {paragraphs.map((text, i) => (
              <p key={i} className={`${i === 0 ? "mt-6" : "mt-4"} font-sans text-base leading-relaxed text-background/70`}>
                {text}
              </p>
            ))}
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
