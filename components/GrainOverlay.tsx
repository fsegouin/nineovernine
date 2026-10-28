"use client";

import { useEffect } from "react";
import { getThemeClass } from "@/lib/theme-class";

/**
 * Generates a canvas noise tile and sets it as --grain-url on <html>.
 * The tile uses foreground-colored pixels at low alpha so it works on
 * both light and dark backgrounds without blend modes.
 * CSS in globals.css applies it via background-image on body and .bg-grain.
 */

const TILE_SIZE = 128;
const SPECKLE_CHANCE_LIGHT = 0.18;
const SPECKLE_ALPHA_LIGHT = 13;
const SPECKLE_CHANCE_DARK = 0.12;
const SPECKLE_ALPHA_DARK = 10;

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function generateNoiseTile(fg: string, isDark: boolean): string {
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const [r, g, b] = hexToRgb(fg);
  const chance = isDark ? SPECKLE_CHANCE_DARK : SPECKLE_CHANCE_LIGHT;
  const alpha = isDark ? SPECKLE_ALPHA_DARK : SPECKLE_ALPHA_LIGHT;
  const imageData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (Math.random() > chance) continue;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = Math.random() * alpha;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export function GrainOverlay() {
  useEffect(() => {
    const apply = () => {
      const theme = getThemeClass();
      const isDark =
        theme === "dark" ||
        (theme === "" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      const fg = getComputedStyle(document.documentElement)
        .getPropertyValue("--foreground")
        .trim();
      const dataUrl = generateNoiseTile(fg, isDark);
      if (dataUrl) {
        document.documentElement.style.setProperty("--grain-url", `url(${dataUrl})`);
      }
    };

    apply();

    // Regenerate on theme toggle to match new foreground color.
    // Track the theme class to avoid regenerating on unrelated class
    // changes (e.g. Lenis adds/removes lenis-scrolling on scroll).
    let prevTheme = getThemeClass();

    const obs = new MutationObserver(() => {
      const theme = getThemeClass();
      if (theme !== prevTheme) {
        prevTheme = theme;
        apply();
      }
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Without a stored theme the foreground follows the OS preference
    const colorSchemeMq = window.matchMedia("(prefers-color-scheme: dark)");
    colorSchemeMq.addEventListener("change", apply);

    return () => {
      obs.disconnect();
      colorSchemeMq.removeEventListener("change", apply);
    };
  }, []);

  return null;
}
