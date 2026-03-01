"use client";

import { useRef } from "react";
import { FadeIn } from "./FadeIn";
import { useProjectTransition } from "./ProjectTransition";
import { projects } from "@/lib/projects";
import type { Project } from "@/lib/projects";

export function WorkSection() {
  return (
    <section id="work" className="px-6 py-24 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
            Selected Work
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Projects
          </h2>
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
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const imageRef = useRef<HTMLDivElement>(null);
  const { navigateToProject } = useProjectTransition();

  const handleClick = () => {
    if (imageRef.current) {
      navigateToProject(project.slug, project.bgClass, imageRef.current);
    }
  };

  return (
    <div className="group cursor-pointer" onClick={handleClick}>
      <div
        ref={imageRef}
        className={`${project.aspectClass} ${project.bgClass} w-full overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]`}
      />
      <div className="mt-4">
        <h3 className="font-display text-lg font-semibold tracking-tight">
          {project.title}
        </h3>
        <p className="mt-1 font-sans text-sm text-muted">{project.category}</p>
      </div>
    </div>
  );
}
