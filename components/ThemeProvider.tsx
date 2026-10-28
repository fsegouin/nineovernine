"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  resolvedTheme: Theme;
  toggleTheme: () => void;
}

const THEME_COLORS: Record<Theme, string> = { light: "#fafafa", dark: "#0a0a0a" };
const THEME_CHANGE_EVENT = "theme-change";

const ThemeContext = createContext<ThemeContextValue>({
  resolvedTheme: "light",
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// THEME_SCRIPT (lib/document.ts) sets the class only for a stored choice;
// without one, the theme follows the OS preference.
function getResolvedTheme(): Theme {
  const classes = document.documentElement.classList;
  if (classes.contains("dark")) return "dark";
  if (classes.contains("light")) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Storage can throw (blocked site data, some private modes); the inline theme script guards it too. */
function hasStoredTheme(): boolean {
  try {
    return localStorage.getItem("theme") !== null;
  } catch {
    return false;
  }
}

/** Replace server-rendered media-based metas with a single dynamic one. */
function syncThemeColor(color: string) {
  document
    .querySelectorAll('meta[name="theme-color"][media]')
    .forEach((meta) => meta.remove());

  let meta = document.querySelector(
    'meta[name="theme-color"]:not([media])'
  ) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onOsChange = () => {
    if (hasStoredTheme()) return;
    syncThemeColor(THEME_COLORS[mq.matches ? "dark" : "light"]);
    onChange();
  };
  mq.addEventListener("change", onOsChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    mq.removeEventListener("change", onOsChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

const getServerSnapshot = (): Theme => "light";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const resolvedTheme = useSyncExternalStore(subscribe, getResolvedTheme, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    const next: Theme = getResolvedTheme() === "light" ? "dark" : "light";
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage blocked: the choice still applies for this page view
    }
    syncThemeColor(THEME_COLORS[next]);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ resolvedTheme, toggleTheme }), [resolvedTheme, toggleTheme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
