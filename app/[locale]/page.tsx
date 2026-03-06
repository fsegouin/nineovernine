import { HeroSection } from "@/components/HeroSection";
import { ServicesSection } from "@/components/ServicesSection";
import { WorkSection } from "@/components/WorkSection";
import { PhilosophySection } from "@/components/PhilosophySection";
import { ContactSection } from "@/components/ContactSection";
import { isValidLocale } from "@/lib/content";
import { notFound } from "next/navigation";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  return (
    <>
      <HeroSection />
      <ServicesSection locale={locale} />
      <WorkSection />
      <PhilosophySection locale={locale} />
      <ContactSection locale={locale} />
    </>
  );
}
