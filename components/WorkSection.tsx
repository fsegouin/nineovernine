"use client";

import { useRef } from "react";
import Image from "next/image";
import { FadeIn } from "./FadeIn";
import { useProjectTransition } from "./ProjectTransition";
import { getProjects } from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { useLocale } from "./LocaleProvider";
import { getContent } from "@/lib/content";

export function WorkSection() {
  const locale = useLocale();
  const { overline, heading, subtitle } = getContent(locale).work;
  const projects = getProjects(locale);
  return (
    <section id="work" className="px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
            {overline}
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            {heading}
          </h2>
          {subtitle && (
            <p className="mt-3 font-sans text-sm text-muted">
              {subtitle}
            </p>
          )}
        </FadeIn>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Row 1: large left, small right */}
          <FadeIn className="md:col-span-7" delay={0.1}>
            <ProjectCard project={projects[0]} />
          </FadeIn>
          <FadeIn className="md:col-span-5" delay={0.2}>
            <ProjectCard project={projects[1]} />
          </FadeIn>

          {/* Row 2: small left, large right */}
          <FadeIn className="md:col-span-5" delay={0.1}>
            <ProjectCard project={projects[2]} />
          </FadeIn>
          <FadeIn className="md:col-span-7" delay={0.2}>
            <ProjectCard project={projects[3]} />
          </FadeIn>

          {/* Row 3: full-width */}
          <FadeIn className="md:col-span-12" delay={0.1}>
            <ProjectCard project={projects[4]} />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const imageRef = useRef<HTMLDivElement>(null);
  const { navigateToProject, activeSlug } = useProjectTransition();

  const handleClick = () => {
    if (imageRef.current) {
      navigateToProject(project.slug, project.bgClass, imageRef.current);
    }
  };

  return (
    <div className="group cursor-pointer" onClick={handleClick}>
      <div
        ref={imageRef}
        className={`relative ${project.aspectClass} ${project.bgClass} w-full overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]`}
        style={activeSlug === project.slug ? { opacity: 0 } : undefined}
      >
        {(project.cardVideo || project.heroVideo) ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            poster={(project.cardVideo ?? project.heroVideo)!.poster}
          >
            <source src={(project.cardVideo ?? project.heroVideo)!.webm} type="video/webm" />
            <source src={(project.cardVideo ?? project.heroVideo)!.mp4} type="video/mp4" />
          </video>
        ) : project.heroImage ? (
          <Image
            src={project.heroImage}
            alt={project.title}
            fill
            sizes="(min-width: 768px) 58vw, 100vw"
            className="object-cover"
            {...(project.heroBlur ? { placeholder: "blur" as const, blurDataURL: project.heroBlur } : {})}
          />
        ) : null}
      </div>
      <div className="mt-4">
        <h3 className="font-display text-lg font-semibold tracking-tight">
          {project.title}
        </h3>
        <p className="mt-1 font-sans text-sm text-muted">{project.category}</p>
      </div>
    </div>
  );
}
