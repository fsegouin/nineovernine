"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

interface ThemeContextValue {
  resolvedTheme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  resolvedTheme: "light",
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function getResolvedTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Sync React state with the theme the inline script already applied.
  useEffect(() => {
    const theme = getResolvedTheme();
    setResolvedTheme(theme);
    syncThemeColor(theme === "dark" ? "#0a0a0a" : "#fafafa");
  }, []);

  // Listen for OS preference changes (only when no manual override)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (!localStorage.getItem("theme")) {
        const next = mq.matches ? "dark" : "light";
        setResolvedTheme(next);
        syncThemeColor(next === "dark" ? "#0a0a0a" : "#fafafa");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "light" ? "dark" : "light";
    setResolvedTheme(next);

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    localStorage.setItem("theme", next);

    syncThemeColor(next === "dark" ? "#0a0a0a" : "#fafafa");
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ resolvedTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
