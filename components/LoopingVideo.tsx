"use client";

import { useEffect, useRef } from "react";

interface LoopingVideoProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "children"> {
  webm?: string;
  mp4?: string;
}

/** Muted, looping, autoplaying video that stays paused for users who ask for reduced motion (WCAG 2.2.2). */
export function LoopingVideo({ webm, mp4, ...props }: LoopingVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (mq.matches) video.pause();
      // play() rejects when autoplay is blocked; the poster stays visible then
      else video.play().catch(() => {});
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <video ref={ref} autoPlay loop muted playsInline {...props}>
      {webm && <source src={webm} type="video/webm" />}
      {mp4 && <source src={mp4} type="video/mp4" />}
    </video>
  );
}
