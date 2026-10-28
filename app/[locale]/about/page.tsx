import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import { TextReveal } from "@/components/TextReveal";
import { getContent, isValidLocale, supportedLocales } from "@/lib/content";
import founderPhoto from "@/public/about/founder.webp";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) return {};
  const content = getContent(locale);
  const description = content.about.metaDescription;
  return {
    title: content.about.heading,
    description,
    // openGraph and alternates replace the layout's values wholesale, so
    // restate the layout's fields and point hreflang at this page.
    openGraph: {
      type: "website",
      locale: locale === "fr" ? "fr_FR" : "en_US",
      siteName: content.meta.title,
      title: content.about.heading,
      description,
    },
    alternates: {
      languages: Object.fromEntries(
        supportedLocales.map((l) => [l, `/${l}/about`])
      ),
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const content = getContent(locale);
  const { heading, founder, vision, values } = content.about;

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
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 md:grid-cols-12 lg:gap-16">
          <FadeIn className="md:col-span-7">
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

          <FadeIn className="md:col-span-5 lg:col-span-4 lg:col-start-9" delay={0.15}>
            <Image
              src={founderPhoto}
              alt={founder.photoAlt}
              placeholder="blur"
              sizes="(min-width: 1024px) 30vw, (min-width: 768px) 40vw, 24rem"
              className="aspect-square w-full max-w-sm bg-muted/10 object-cover md:max-w-none"
            />
          </FadeIn>
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
