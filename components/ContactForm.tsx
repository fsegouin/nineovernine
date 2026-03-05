"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import content from "@/lib/content.json";
import { Magnetic } from "./Magnetic";

const EASE = [0.22, 1, 0.36, 1] as const;
const { steps, nextLabel, submitLabel, successHeading, successMessage, errorMessage, orEmailLabel } = content.contact.form;
const TOTAL_STEPS = steps.length;

type FormData = {
  name: string;
  email: string;
  services: string[];
  message: string;
};

function validateStep(step: number, data: FormData): string | null {
  switch (step) {
    case 0:
      return data.name.trim().length >= 2 ? null : "Please enter at least 2 characters.";
    case 1: {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRe.test(data.email) ? null : "Please enter a valid email.";
    }
    case 2:
      return data.services.length > 0 ? null : "Please select at least one service.";
    case 3:
      return data.message.trim().length >= 10 ? null : "Please write at least 10 characters.";
    default:
      return null;
  }
}

export function ContactForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>({ name: "", email: "", services: [], message: "" });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Auto-focus input on step change
  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(timeout);
  }, [step]);

  const advance = useCallback(() => {
    const err = validateStep(step, data);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      submit();
    }
  }, [step, data]);

  const submit = async () => {
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
    } catch {
      setStatus("error");
      setError(errorMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && steps[step].type !== "textarea") {
      e.preventDefault();
      advance();
    }
    if (e.key === "Enter" && steps[step].type === "textarea" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      advance();
    }
  };

  const toggleService = (service: string) => {
    setError(null);
    setData((d) => ({
      ...d,
      services: d.services.includes(service)
        ? d.services.filter((s) => s !== service)
        : [...d.services, service],
    }));
  };

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mt-12 text-center"
      >
        <motion.svg
          viewBox="0 0 48 48"
          className="mx-auto mb-6 h-12 w-12 text-foreground"
          initial="hidden"
          animate="visible"
        >
          <motion.circle
            cx="24"
            cy="24"
            r="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1 } }}
            transition={{ duration: 0.6, ease: EASE }}
          />
          <motion.path
            d="M14 24l7 7 13-13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1 } }}
            transition={{ duration: 0.4, delay: 0.5, ease: EASE }}
          />
        </motion.svg>
        <h3 className="font-display text-2xl font-bold md:text-3xl">
          {successHeading.replace("{name}", data.name.split(" ")[0])}
        </h3>
        <p className="mt-2 font-sans text-muted">{successMessage}</p>
      </motion.div>
    );
  }

  const currentStep = steps[step];
  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="mt-12 mx-auto max-w-md text-left" onKeyDown={handleKeyDown}>
      {/* Progress indicator */}
      <div className="mb-8 flex gap-1.5">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            className="h-0.5 flex-1 rounded-full"
            initial={false}
            animate={{ backgroundColor: i <= step ? "var(--foreground)" : "var(--border)" }}
            transition={{ duration: 0.3, ease: EASE }}
          />
        ))}
      </div>

      <div aria-live="polite" className="relative min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <fieldset>
              <legend className="font-display text-xl font-bold tracking-tight md:text-2xl">
                {currentStep.question}
              </legend>

              <div className="mt-4">
                {currentStep.type === "text" || currentStep.type === "email" ? (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type={currentStep.type}
                    placeholder={currentStep.placeholder}
                    value={data[currentStep.field as "name" | "email"] as string}
                    onChange={(e) => {
                      setError(null);
                      setData((d) => ({ ...d, [currentStep.field]: e.target.value }));
                    }}
                    className="w-full border-b-2 border-border bg-transparent py-3 font-sans text-lg text-foreground outline-none transition-colors duration-300 placeholder:text-muted/50 focus:border-foreground"
                    autoComplete={currentStep.field === "email" ? "email" : "name"}
                  />
                ) : currentStep.type === "chips" ? (
                  <div className="flex flex-wrap gap-2">
                    {currentStep.options!.map((option) => {
                      const selected = data.services.includes(option);
                      return (
                        <motion.button
                          key={option}
                          type="button"
                          onClick={() => toggleService(option)}
                          className={`rounded-full border px-4 py-2 font-sans text-sm transition-colors ${
                            selected
                              ? "border-foreground bg-foreground text-background"
                              : "border-border text-muted hover:border-foreground hover:text-foreground"
                          }`}
                          animate={{ scale: selected ? 1.02 : 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          {option}
                        </motion.button>
                      );
                    })}
                  </div>
                ) : currentStep.type === "textarea" ? (
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    placeholder={currentStep.placeholder}
                    value={data.message}
                    onChange={(e) => {
                      setError(null);
                      setData((d) => ({ ...d, message: e.target.value }));
                    }}
                    rows={4}
                    className="w-full resize-none border-b-2 border-border bg-transparent py-3 font-sans text-lg text-foreground outline-none transition-colors duration-300 placeholder:text-muted/50 focus:border-foreground"
                  />
                ) : null}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 font-sans text-sm text-red-500"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </fieldset>

            {/* Action button */}
            <div className="mt-6">
              <Magnetic strength={0.2}>
                <motion.button
                  type="button"
                  onClick={advance}
                  disabled={status === "submitting"}
                  className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-sans text-sm font-medium text-background transition-opacity disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {status === "submitting" ? (
                    <motion.span
                      className="inline-block h-4 w-4 rounded-full border-2 border-background border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    />
                  ) : (
                    <>
                      {isLastStep ? submitLabel : nextLabel}
                      <motion.span
                        className="inline-block"
                        initial={{ x: -4, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.3, ease: EASE }}
                      >
                        &rarr;
                      </motion.span>
                    </>
                  )}
                </motion.button>
              </Magnetic>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Back link */}
      {step > 0 && status !== "submitting" && (
        <motion.button
          type="button"
          onClick={() => { setStep(step - 1); setError(null); }}
          className="mt-4 font-sans text-xs text-muted underline underline-offset-4 transition-colors hover:text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          &larr; Back
        </motion.button>
      )}
    </div>
  );
}
