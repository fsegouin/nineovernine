import { FadeIn } from "./FadeIn";
import content from "@/lib/content.json";

const { overline, heading, items } = content.services;

export function ServicesSection() {
  return (
    <section className="border-t border-border px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
            {overline}
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            {heading}
          </h2>
        </FadeIn>

        <div className="mt-16 grid grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
          {items.map((service, i) => (
            <FadeIn key={service.number} delay={i * 0.08}>
              <div className="group border-t border-border py-8">
                <span className="font-sans text-xs text-muted">
                  {service.number}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold tracking-tight transition-colors group-hover:text-muted">
                  {service.title}
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-muted">
                  {service.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
