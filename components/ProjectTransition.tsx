"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useLenis } from "@/components/SmoothScroll";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TransitionState {
  bgClass: string;
  snapshot: string | null;
  from: Rect;
  to: Rect;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface TransitionContextValue {
  navigateToProject: (
    slug: string,
    bgClass: string,
    el: HTMLElement
  ) => void;
  navigateBack: (slug: string, bgClass: string) => void;
  activeSlug: string | null;
  snapshot: string | null;
  clearSnapshot: () => void;
}

const TransitionContext = createContext<TransitionContextValue>({
  navigateToProject: () => {},
  navigateBack: () => {},
  activeSlug: null,
  snapshot: null,
  clearSnapshot: () => {},
});

export const useProjectTransition = () => useContext(TransitionContext);

/** Capture a snapshot of an element's visible content as a data URL. */
function captureSnapshot(el: HTMLElement): string | null {
  try {
    // Look for a video or image inside the element
    const video = el.querySelector("video");
    const img = el.querySelector("img");

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (video && video.readyState >= 2) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.85);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.85);
    }
  } catch {
    // Cross-origin or other canvas errors — fall back to bgClass
  }
  return null;
}

export function ProjectTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const lenisRef = useLenis();
  const [state, setState] = useState<TransitionState | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [persistedSnapshot, setPersistedSnapshot] = useState<string | null>(null);

  const clearSnapshot = useCallback(() => {
    setPersistedSnapshot(null);
  }, []);

  const navigateToProject = useCallback(
    (slug: string, bgClass: string, el: HTMLElement) => {
      const snapshot = captureSnapshot(el);
      setPersistedSnapshot(snapshot);

      const r = el.getBoundingClientRect();
      const from: Rect = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      };
      const w = document.documentElement.clientWidth;
      const to: Rect = {
        top: 64,
        left: 0,
        width: w,
        height: w * (9 / 16),
      };

      // Stop Lenis to kill any scroll momentum before navigating
      lenisRef.current?.stop();

      setActiveSlug(slug);
      setState({ bgClass, snapshot, from, to });

      setTimeout(() => {
        window.scrollTo({ top: 0 });
        router.push(`/projects/${slug}`);
      }, 50);
    },
    [router]
  );

  const navigateBack = useCallback(
    (_slug: string, _bgClass: string) => {
      router.push("/#work");
    },
    [router]
  );

  return (
    <TransitionContext.Provider value={{ navigateToProject, navigateBack, activeSlug, snapshot: persistedSnapshot, clearSnapshot }}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            key="project-transition"
            className="pointer-events-none fixed inset-0 z-40"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-background"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.08, ease: EASE }}
            />

            {/* Animated rect */}
            <motion.div
              className={`${state.bgClass} absolute overflow-hidden`}
              initial={{
                top: state.from.top,
                left: state.from.left,
                width: state.from.width,
                height: state.from.height,
              }}
              animate={{
                top: state.to.top,
                left: state.to.left,
                width: state.to.width,
                height: state.to.height,
              }}
              transition={{ duration: 0.55, ease: EASE }}
              onAnimationComplete={() => {
                setTimeout(() => {
                  lenisRef.current?.start();
                  setState(null);
                  setActiveSlug(null);
                }, 150);
              }}
            >
              {state.snapshot && (
                <img
                  src={state.snapshot}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TransitionContext.Provider>
  );
}
