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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setResolvedTheme(getResolvedTheme());
  }, []);

  // Listen for OS preference changes (only applies when no manual override)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (!localStorage.getItem("theme")) {
        setResolvedTheme(mq.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Keep theme-color meta tags in sync with manual overrides
  useEffect(() => {
    if (localStorage.getItem("theme")) {
      const color = resolvedTheme === "dark" ? "#0a0a0a" : "#fafafa";
      document
        .querySelectorAll('meta[name="theme-color"]')
        .forEach((meta) => meta.setAttribute("content", color));
    }
  }, [resolvedTheme]);

  const toggleTheme = useCallback(() => {
    const next = resolvedTheme === "light" ? "dark" : "light";
    setResolvedTheme(next);

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    localStorage.setItem("theme", next);
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ resolvedTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
