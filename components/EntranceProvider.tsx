"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
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

const FONT_WAIT_MS = 2000;

// ENTRANCE_SCRIPT (lib/document.ts) decides before paint whether this load is a
// first visit and marks it with data-entrance="pending". The attribute is removed
// once the entrance starts, so the answer is latched for the life of the page.
let firstVisitLatch: boolean | undefined;

function getIsFirstVisit() {
  firstVisitLatch ??= document.documentElement.dataset.entrance === "pending";
  return firstVisitLatch;
}

// The answer never changes after the head script runs, so there is nothing to subscribe to
const subscribe = () => () => {};

// The server render shows everything; the head script's CSS keeps entrance
// elements hidden until the client takes over.
const getServerSnapshot = () => false;

export function EntranceProvider({ children }: { children: React.ReactNode }) {
  const isFirstVisit = useSyncExternalStore(subscribe, getIsFirstVisit, getServerSnapshot);
  const [fontsReady, setFontsReady] = useState(false);
  const ready = !isFirstVisit || fontsReady;

  // On a first visit, wait for fonts (or a timeout) before revealing
  useEffect(() => {
    if (!isFirstVisit) return;

    let cancelled = false;
    const timeout = new Promise((r) => setTimeout(r, FONT_WAIT_MS));
    Promise.race([document.fonts.ready, timeout]).then(() => {
      if (!cancelled) setFontsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isFirstVisit]);

  // Remove the CSS-level entrance hiding after React has committed the
  // ready state: Motion's inline styles are now in control.
  useEffect(() => {
    if (isFirstVisit && ready) {
      delete document.documentElement.dataset.entrance;
    }
  }, [isFirstVisit, ready]);

  const value = useMemo(() => ({ isFirstVisit, ready }), [isFirstVisit, ready]);

  return <EntranceContext value={value}>{children}</EntranceContext>;
}
