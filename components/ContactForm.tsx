"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Magnetic } from "./Magnetic";
import { useLocale } from "./LocaleProvider";
import { getContent } from "@/lib/content";
import {
  EMAIL_RE,
  MAX_EMAIL_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  MIN_MESSAGE_LENGTH,
  MIN_NAME_LENGTH,
} from "@/lib/contact";
import { EASE } from "@/lib/motion";
import { trackEvent } from "@/lib/analytics";

// Long enough for a slow mail provider; the idempotency key makes a retry after it safe
const SUBMIT_TIMEOUT_MS = 20_000;

type ContactFormData = {
  name: string;
  email: string;
  services: string[];
  message: string;
};

type Field = keyof ContactFormData;

function isStepValid(field: Field, data: ContactFormData): boolean {
  switch (field) {
    case "name":
      return data.name.trim().length >= MIN_NAME_LENGTH;
    case "email":
      return EMAIL_RE.test(data.email);
    case "services":
      return data.services.length > 0;
    case "message":
      return data.message.trim().length >= MIN_MESSAGE_LENGTH;
  }
}

export function ContactForm() {
  const locale = useLocale();
  const { steps, nextLabel, submitLabel, successHeading, successMessage, errorMessage, backLabel, stepProgress, errors } = getContent(locale).contact.form;
  const totalSteps = steps.length;
  const [step, setStep] = useState(0);
  const [data, setData] = useState<ContactFormData>({ name: "", email: "", services: [], message: "" });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  // Bots fill every field; people never see this one
  const [honey, setHoney] = useState("");
  // Set when a step change should move focus. The next step only mounts once the
  // previous one has animated out, so focus is applied by the new control's ref.
  const pendingFocus = useRef(false);
  // One key per submitted payload: a retry of the same message reuses it, so the route
  // can ask Resend not to send it twice when the first attempt was delivered but timed out
  const submission = useRef<{ payload: string; key: string | undefined } | null>(null);

  const focusOnMount = (el: HTMLElement | null) => {
    if (el && pendingFocus.current) {
      pendingFocus.current = false;
      el.focus({ preventScroll: true });
    }
  };

  const goToStep = (next: number) => {
    pendingFocus.current = true;
    setStep(next);
  };

  const submit = async () => {
    setStatus("submitting");
    setError(null);
    // Stays null when the request never got a response (offline, blocked)
    let httpStatus: number | null = null;
    try {
      const payload = JSON.stringify(data);
      if (submission.current?.payload !== payload) {
        // randomUUID needs a secure context; over plain http (a LAN dev server) the send goes without a key
        const key = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : undefined;
        submission.current = { payload, key };
      }
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, _honey: honey, submissionId: submission.current.key }),
        signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
      });
      httpStatus = res.status;
      if (!res.ok) throw new Error("Failed");
      // The route accepts spam-trap submissions silently; they are not conversions
      if (!honey) trackEvent("contact_submitted", { services: data.services.length });
      pendingFocus.current = true;
      setStatus("success");
    } catch {
      trackEvent("contact_failed", { status: httpStatus });
      setStatus("error");
      setError(errorMessage);
    }
  };

  const advance = () => {
    // The button stays focusable while submitting, so both it and the keyboard shortcut land here
    if (status === "submitting") return;
    const field = steps[step].field as Field;
    if (!isStepValid(field, data)) {
      setError(errors[field]);
      return;
    }
    setError(null);
    if (step < totalSteps - 1) {
      trackEvent("contact_step", { step: step + 1 });
      goToStep(step + 1);
    } else {
      void submit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Buttons (Back, service chips, the action button) handle Enter natively;
    // intercepting it here made Enter on "Back" advance the form instead.
    if (e.target instanceof HTMLButtonElement) return;
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
          aria-hidden="true"
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
        <h3
          ref={focusOnMount}
          tabIndex={-1}
          className="font-display text-2xl font-bold outline-none md:text-3xl"
        >
          {successHeading.replace("{name}", () => data.name.trim().split(/\s+/)[0])}
        </h3>
        <p className="mt-2 font-sans text-muted">{successMessage}</p>
      </motion.div>
    );
  }

  const currentStep = steps[step];
  const isLastStep = step === totalSteps - 1;

  return (
    <div className="mt-12 mx-auto max-w-md text-left" onKeyDown={handleKeyDown}>
      <input
        type="text"
        name="website"
        value={honey}
        onChange={(e) => setHoney(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />
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

      {/* Focus moves to each new step's control, which announces it; the error is role="alert" */}
      <div className="relative min-h-[180px]">
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
                <span className="sr-only">
                  {stepProgress.replace("{current}", String(step + 1)).replace("{total}", String(totalSteps))}.{" "}
                </span>
                {currentStep.question}
              </legend>

              <div className="mt-4">
                {currentStep.type === "text" || currentStep.type === "email" ? (
                  <input
                    ref={focusOnMount}
                    type={currentStep.type}
                    maxLength={currentStep.field === "email" ? MAX_EMAIL_LENGTH : MAX_NAME_LENGTH}
                    placeholder={currentStep.placeholder}
                    value={data[currentStep.field as "name" | "email"] as string}
                    onChange={(e) => {
                      setError(null);
                      setData((d) => ({ ...d, [currentStep.field]: e.target.value }));
                    }}
                    className="w-full border-b-2 border-border bg-transparent py-3 font-sans text-lg text-foreground outline-none transition-colors duration-300 placeholder:text-muted focus:border-foreground"
                    autoComplete={currentStep.field === "email" ? "email" : "name"}
                    aria-required="true"
                    aria-label={currentStep.question}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "contact-form-error" : undefined}
                  />
                ) : currentStep.type === "chips" ? (
                  <div className="flex flex-wrap gap-2">
                    {currentStep.options!.map((option, i) => {
                      const selected = data.services.includes(option);
                      return (
                        <motion.button
                          key={option}
                          ref={i === 0 ? focusOnMount : undefined}
                          type="button"
                          aria-pressed={selected}
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
                    ref={focusOnMount}
                    maxLength={MAX_MESSAGE_LENGTH}
                    placeholder={currentStep.placeholder}
                    value={data.message}
                    onChange={(e) => {
                      setError(null);
                      setData((d) => ({ ...d, message: e.target.value }));
                    }}
                    rows={4}
                    aria-required="true"
                    aria-label={currentStep.question}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "contact-form-error" : undefined}
                    className="w-full resize-none border-b-2 border-border bg-transparent py-3 font-sans text-lg text-foreground outline-none transition-colors duration-300 placeholder:text-muted focus:border-foreground"
                  />
                ) : null}
              </div>

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 font-sans text-sm text-danger"
                    id="contact-form-error"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </fieldset>

            <div className="mt-6">
              <Magnetic strength={0.2} className="inline-block">
                <motion.button
                  type="button"
                  onClick={advance}
                  // aria-disabled rather than disabled, which would drop keyboard focus; advance() ignores clicks while sending
                  aria-disabled={status === "submitting" || undefined}
                  aria-busy={status === "submitting"}
                  aria-label={status === "submitting" ? submitLabel : undefined}
                  className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-sans text-sm font-medium text-background transition-opacity aria-disabled:opacity-50"
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
                        aria-hidden="true"
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

      {step > 0 && status !== "submitting" && (
        <motion.button
          type="button"
          onClick={() => { goToStep(step - 1); setError(null); }}
          className="mt-4 font-sans text-xs text-muted underline underline-offset-4 transition-colors hover:text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span aria-hidden="true">&larr;</span> {backLabel}
        </motion.button>
      )}
    </div>
  );
}
