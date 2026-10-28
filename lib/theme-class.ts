export type ThemeClass = "dark" | "light" | "";

/** The theme class on <html>: set for a stored choice, empty when the OS preference applies. */
export function getThemeClass(): ThemeClass {
  const list = document.documentElement.classList;
  return list.contains("dark") ? "dark" : list.contains("light") ? "light" : "";
}
