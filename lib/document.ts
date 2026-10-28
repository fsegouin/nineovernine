import type { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

/** Runs before paint: applies a stored theme choice so there is no flash of the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.classList.add(t);var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].remove();var n=document.createElement("meta");n.name="theme-color";n.content=t==="dark"?"#0a0a0a":"#fafafa";document.head.appendChild(n)}}catch(e){}})()`;

/**
 * Runs before paint: on the first visit of a session (and without reduced motion)
 * marks <html data-entrance="pending">, records the visit, and injects a <style>
 * that hides entrance elements even before the main stylesheet loads.
 * EntranceProvider reads the attribute and removes it once the entrance can start.
 */
export const ENTRANCE_SCRIPT = `try{if(!sessionStorage.getItem('9o9-visited')&&!window.matchMedia('(prefers-reduced-motion:reduce)').matches){document.documentElement.dataset.entrance='pending';var s=document.createElement('style');s.textContent='[data-entrance=\"pending\"] [data-entrance-el]{opacity:0!important;visibility:hidden}';document.head.appendChild(s);sessionStorage.setItem('9o9-visited','1')}}catch(e){}`;
