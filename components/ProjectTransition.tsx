"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TransitionState {
  bgClass: string;
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
}

const TransitionContext = createContext<TransitionContextValue>({
  navigateToProject: () => {},
});

export const useProjectTransition = () => useContext(TransitionContext);

export function ProjectTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<TransitionState | null>(null);

  const navigateToProject = useCallback(
    (slug: string, bgClass: string, el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const from: Rect = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      };
      const w = window.innerWidth;
      const to: Rect = {
        top: 64,
        left: 0,
        width: w,
        height: w * (9 / 16),
      };

      setState({ bgClass, from, to });

      setTimeout(() => {
        router.push(`/projects/${slug}`);
      }, 50);
    },
    [router]
  );

  return (
    <TransitionContext.Provider value={{ navigateToProject }}>
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
            {/* Backdrop — covers page content during transition */}
            <motion.div
              className="absolute inset-0 bg-background"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: EASE }}
            />

            {/* Expanding image */}
            <motion.div
              className={`${state.bgClass} absolute`}
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
                setTimeout(() => setState(null), 150);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </TransitionContext.Provider>
  );
}
