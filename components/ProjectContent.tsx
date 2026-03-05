"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import type { Project, GalleryItem } from "@/lib/projects";
import { useProjectTransition } from "@/components/ProjectTransition";
import { useLocale } from "./LocaleProvider";
import { getContent } from "@/lib/content";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function ProjectContent({
  project,
  nextProject,
}: {
  project: Project;
  nextProject: Project;
}) {
  const locale = useLocale();
  const { backLabel, yearLabel, roleLabel, agencyLabel, clientLabel, overviewLabel, nextLabel, visitLabel } = getContent(locale).projectDetail;
  const router = useRouter();
  const nextRef = useRef<HTMLDivElement>(null);
  const [exiting, setExiting] = useState(false);
  const { navigateToProject, navigateBack, activeSlug, snapshot, clearSnapshot } = useProjectTransition();
  const directLand = !activeSlug;

  const handleBack = () => {
    setExiting(true);
    setTimeout(() => {
      navigateBack(project.slug, project.bgClass);
    }, 300);
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
      {/* Hero — constrained to content width */}
      <div className="relative mx-auto max-w-7xl px-6 pt-6 lg:px-12 lg:pt-12">
        <motion.div
          initial={directLand ? { clipPath: "inset(0 0 100% 0)" } : false}
          animate={directLand ? { clipPath: "inset(0 0 0% 0)" } : undefined}
          transition={directLand ? { duration: 0.8, ease: EASE } : undefined}
        >
          {project.heroVideo ? (
            <video
              className="aspect-video w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              poster={project.heroVideo.poster}
            >
              <source src={project.heroVideo.webm} type="video/webm" />
              <source src={project.heroVideo.mp4} type="video/mp4" />
            </video>
          ) : project.heroImage ? (
            <div className="relative aspect-video w-full">
              <Image
                src={project.heroImage}
                alt={project.title}
                fill
                priority
                sizes="100vw"
                className="object-cover"
                {...(project.heroBlur ? { placeholder: "blur" as const, blurDataURL: project.heroBlur } : {})}
              />
            </div>
          ) : (
            <div className={`${project.bgClass} aspect-video w-full`} />
          )}
        </motion.div>

        {/* Crossfade overlay — card snapshot fades out to reveal hero */}
        {snapshot && !directLand && (
          <motion.img
            src={snapshot}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
            onAnimationComplete={clearSnapshot}
          />
        )}
      </div>

      {/* Content — enters from below after overlay settles */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: directLand ? 0.5 : 0.4, ease: EASE }}
      >
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-24">
          {/* Back */}
          <button
            onClick={handleBack}
            className="font-sans text-sm text-muted transition-colors hover:text-foreground"
          >
            &larr; {backLabel}
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
                {yearLabel}
              </p>
              <p className="mt-2 font-display text-lg font-semibold">
                {project.year}
              </p>
              {project.role && (
                <>
                  <p className="mt-6 font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
                    {roleLabel}
                  </p>
                  <p className="mt-2 font-sans text-base">
                    {project.role}
                  </p>
                </>
              )}
              {project.agency && (
                <>
                  <p className="mt-6 font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
                    {agencyLabel}
                  </p>
                  <p className="mt-2 font-sans text-base">
                    {project.agency}
                  </p>
                </>
              )}
              {project.client && (
                <>
                  <p className="mt-6 font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
                    {clientLabel}
                  </p>
                  <p className="mt-2 font-sans text-base">
                    {project.client}
                  </p>
                </>
              )}
              <p className="mt-8 font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
                {overviewLabel}
              </p>
              <p className="mt-2 font-sans text-base leading-relaxed text-muted">
                {project.description}
              </p>
            </div>
          </div>

          {/* Gallery */}
          {project.gallery && project.gallery.length > 0 ? (
            <Gallery items={project.gallery} title={project.title} />
          ) : (
            <div className="mt-24 space-y-6">
              <div className="aspect-video w-full bg-muted/10" />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="aspect-square bg-muted/10" />
                <div className="aspect-square bg-muted/10" />
              </div>
            </div>
          )}

          {/* Exhibition plaque — credit & client link */}
          {(project.credit || project.clientUrl) && (
            <div className="mt-24 max-w-xs">
              <div className="mb-4 h-8 w-8 border border-border" />
              <div className="space-y-2">
                {project.credit && (
                  <p className="font-sans text-xs leading-relaxed text-muted italic">
                    {project.credit}
                  </p>
                )}
                {project.clientUrl && (
                  <a
                    href={project.clientUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-sans text-xs text-muted underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
                  >
                    {visitLabel} &rsaquo;
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Next project */}

          <div className="mt-24 border-t border-border pt-12">
            <p className="font-sans text-xs font-medium uppercase tracking-[0.2em] text-muted">
              {nextLabel}
            </p>
            <div onClick={handleNext} className="group mt-8 cursor-pointer">
              <div
                ref={nextRef}
                className={`relative ${nextProject.bgClass} aspect-video w-full overflow-hidden transition-transform duration-500 group-hover:scale-[1.01]`}
              >
                {(nextProject.cardVideo || nextProject.heroVideo) ? (
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster={(nextProject.cardVideo ?? nextProject.heroVideo)!.poster}
                  >
                    <source src={(nextProject.cardVideo ?? nextProject.heroVideo)!.webm} type="video/webm" />
                    <source src={(nextProject.cardVideo ?? nextProject.heroVideo)!.mp4} type="video/mp4" />
                  </video>
                ) : nextProject.heroImage ? (
                  <Image
                    src={nextProject.heroImage}
                    alt={nextProject.title}
                    fill
                    sizes="100vw"
                    className="object-cover"
                    {...(nextProject.heroBlur ? { placeholder: "blur" as const, blurDataURL: nextProject.heroBlur } : {})}
                  />
                ) : null}
              </div>
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

function Gallery({ items, title }: { items: GalleryItem[]; title: string }) {
  const fullItems: GalleryItem[] = [];
  const halfPairs: GalleryItem[][] = [];
  let halfBuffer: GalleryItem[] = [];

  for (const item of items) {
    if (item.layout === "full") {
      if (halfBuffer.length > 0) {
        halfPairs.push(halfBuffer);
        halfBuffer = [];
      }
      fullItems.push(item);
    } else {
      halfBuffer.push(item);
      if (halfBuffer.length === 2) {
        halfPairs.push(halfBuffer);
        halfBuffer = [];
      }
    }
  }
  if (halfBuffer.length > 0) halfPairs.push(halfBuffer);

  // Interleave: maintain original order by index
  const rows: React.ReactNode[] = [];
  let fullIdx = 0;
  let halfIdx = 0;
  let detailNum = 0;

  for (const item of items) {
    if (item.layout === "full") {
      if (fullIdx === 0 || rows.every((r) => r !== `full-${fullIdx}`)) {
        rows.push(
          <GalleryMedia
            key={`full-${fullIdx}`}
            item={item}
            alt={`${title} — detail ${++detailNum}`}
            className="aspect-video w-full object-cover"
            sizes="100vw"
          />
        );
      }
      fullIdx++;
    } else if (item === halfPairs[halfIdx]?.[0]) {
      const pair = halfPairs[halfIdx];
      rows.push(
        <div key={`half-${halfIdx}`} className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {pair.map((pairItem, j) => (
            <GalleryMedia
              key={j}
              item={pairItem}
              alt={`${title} — detail ${++detailNum}`}
              className="aspect-square w-full object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          ))}
        </div>
      );
      halfIdx++;
    }
  }

  return <div className="mt-24 space-y-6">{rows}</div>;
}

function GalleryMedia({
  item,
  alt,
  className,
  sizes,
}: {
  item: GalleryItem;
  alt: string;
  className: string;
  sizes: string;
}) {
  if (item.type === "video") {
    return (
      <video className={`${className} bg-muted/10`} autoPlay loop muted playsInline poster={item.poster}>
        <source src={item.webm} type="video/webm" />
        <source src={item.mp4} type="video/mp4" />
      </video>
    );
  }

  const pos = item.position ?? "center";
  const posClass = pos === "left" ? "object-left" : pos === "right" ? "object-right" : "object-center";
  const isSquare = className.includes("aspect-square");

  return (
    <div className={`relative ${isSquare ? "aspect-square" : "aspect-video"}`}>
      <Image
        src={item.src!}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover ${posClass}`}
        {...(item.blurDataURL ? { placeholder: "blur" as const, blurDataURL: item.blurDataURL } : {})}
      />
    </div>
  );
}
