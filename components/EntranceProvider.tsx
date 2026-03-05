"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

interface EntranceState {
  /** True when this is a first visit in the current session */
  isFirstVisit: boolean;
  /** True once fonts are loaded and entrance can begin animating */
  ready: boolean;
}

const EntranceContext = createContext<EntranceState>({
  isFirstVisit: false,
  ready: true,
});

export function useEntrance() {
  return useContext(EntranceContext);
}

const SESSION_KEY = "9o9-visited";

export function EntranceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EntranceState>({
    isFirstVisit: false,
    ready: true,
  });

  // useLayoutEffect fires before the browser paints — this prevents a
  // flash of fully-visible content before the entrance hides elements.
  // The initial render matches the server (isFirstVisit=false, everything
  // visible). This effect immediately updates state to isFirstVisit=true,
  // triggering a synchronous re-render BEFORE the first paint.
  useLayoutEffect(() => {
    try {
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      const visited = sessionStorage.getItem(SESSION_KEY);
      const isFirst = !visited && !prefersReduced;

      if (!isFirst) return;

      sessionStorage.setItem(SESSION_KEY, "1");
      setState({ isFirstVisit: true, ready: false });
    } catch {
      // sessionStorage unavailable (private browsing, etc.)
    }
  }, []);

  // Once we know it's a first visit, wait for fonts before revealing
  useEffect(() => {
    if (!state.isFirstVisit || state.ready) return;

    let cancelled = false;
    const fontReady = document.fonts.ready;
    const timeout = new Promise((r) => setTimeout(r, 2000));

    Promise.race([fontReady, timeout]).then(() => {
      if (!cancelled) {
        setState({ isFirstVisit: true, ready: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state.isFirstVisit, state.ready]);

  // Remove the CSS-level entrance hiding after React has committed the
  // ready state — Motion's inline styles are now in control.
  useEffect(() => {
    if (state.isFirstVisit && state.ready) {
      delete document.documentElement.dataset.entrance;
    }
  }, [state.isFirstVisit, state.ready]);

  return (
    <EntranceContext.Provider value={state}>
      {children}
    </EntranceContext.Provider>
  );
}
