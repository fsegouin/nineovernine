"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/projects";
import { useProjectTransition } from "@/components/ProjectTransition";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function ProjectContent({
  project,
  nextProject,
}: {
  project: Project;
  nextProject: Project;
}) {
  const router = useRouter();
  const nextRef = useRef<HTMLDivElement>(null);
  const [exiting, setExiting] = useState(false);
  const { navigateToProject } = useProjectTransition();

  const handleBack = () => {
    setExiting(true);
    setTimeout(() => router.push("/#work"), 300);
  };

  const handleNext = () => {
    if (nextRef.current) {
      navigateToProject(
        nextProject.slug,
        nextProject.bgClass,
        nextRef.current
      );
    }
  };

  return (
    <motion.div
      animate={exiting ? { opacity: 0, y: -20 } : {}}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {/* Hero — matches overlay final position exactly */}
      <div className={`${project.bgClass} aspect-video w-full`} />

      {/* Content — enters from below after overlay settles */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
      >
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-24">
          {/* Back */}
          <button
            onClick={handleBack}
            className="font-sans text-sm text-muted transition-colors hover:text-foreground"
          >
            &larr; Back to projects
          </button>

          {/* Project info */}
          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
                {project.category}
              </p>
              <h1 className="mt-4 font-display text-5xl font-bold tracking-tight md:text-6xl">
                {project.title}
              </h1>
            </div>
            <div className="lg:col-span-5">
              <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
                Year
              </p>
              <p className="mt-2 font-display text-lg font-semibold">
                {project.year}
              </p>
              <p className="mt-8 font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
                Overview
              </p>
              <p className="mt-2 font-sans text-base leading-relaxed text-muted">
                {project.description}
              </p>
            </div>
          </div>

          {/* Placeholder gallery */}
          <div className="mt-24 space-y-6">
            <div className="aspect-video w-full bg-muted/10" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="aspect-square bg-muted/10" />
              <div className="aspect-square bg-muted/10" />
            </div>
          </div>

          {/* Next project */}
          <div className="mt-24 border-t border-border pt-12">
            <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Next Project
            </p>
            <div onClick={handleNext} className="group mt-8 cursor-pointer">
              <div
                ref={nextRef}
                className={`${nextProject.bgClass} aspect-video w-full transition-transform duration-500 group-hover:scale-[1.01]`}
              />
              <div className="mt-4">
                <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                  {nextProject.title}
                </h2>
                <p className="mt-1 font-sans text-sm text-muted">
                  {nextProject.category}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
