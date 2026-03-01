import { FadeIn } from "./FadeIn";

const services = [
  {
    number: "01",
    title: "Strategy & Consulting",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    number: "02",
    title: "AI Integration",
    description:
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    number: "03",
    title: "Digital Product Design",
    description:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  },
  {
    number: "04",
    title: "Brand & Identity",
    description:
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  {
    number: "05",
    title: "Development & Engineering",
    description:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam.",
  },
  {
    number: "06",
    title: "Content & Experience",
    description:
      "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni.",
  },
];

export function ServicesSection() {
  return (
    <section className="border-t border-border px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Capabilities
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Services
          </h2>
        </FadeIn>

        <div className="mt-16 grid grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
          {services.map((service, i) => (
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
