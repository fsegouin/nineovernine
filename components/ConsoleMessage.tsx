"use client";

import { useEffect } from "react";

export function ConsoleMessage() {
  useEffect(() => {
    console.log(
      "%c9/9%c — Nice, you're curious.\nWe build things here. Want to build with us? hello@nineovernine.com",
      "font-size: 32px; font-weight: 700; color: #fafafa; background: #0a0a0a; padding: 8px 12px; border-radius: 4px;",
      "font-size: 14px; color: inherit;"
    );
  }, []);

  return null;
}
