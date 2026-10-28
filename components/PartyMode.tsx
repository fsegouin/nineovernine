"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useKonamiCode } from "@/hooks/useKonamiCode";
import { useLocale } from "./LocaleProvider";
import { getContent } from "@/lib/content";
import { EASE } from "@/lib/motion";

const PartyContext = createContext(false);
export const usePartyMode = () => useContext(PartyContext);

export function PartyModeProvider({ children }: { children: React.ReactNode }) {
  const { partyToast } = getContent(useLocale()).easterEgg;
  const [active, setActive] = useState(false);

  const activate = useCallback(() => {
    if (active) return;
    setActive(true);
    document.documentElement.classList.add("party-mode");
    setTimeout(() => {
      setActive(false);
      document.documentElement.classList.remove("party-mode");
    }, 5000);
  }, [active]);

  useKonamiCode(activate);

  return (
    <PartyContext value={active}>
      {children}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            role="status"
            transition={{ duration: 0.4, ease: EASE }}
            className="pointer-events-none fixed bottom-8 left-1/2 z-[200] -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background"
          >
            {partyToast}
          </motion.div>
        )}
      </AnimatePresence>
    </PartyContext>
  );
}
