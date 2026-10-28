import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  EMAIL_RE,
  MAX_EMAIL_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  MIN_MESSAGE_LENGTH,
  MIN_NAME_LENGTH,
  SERVICE_OPTIONS,
} from "@/lib/contact";

const FROM_EMAIL = "Nine Over Nine <hello@contact.nineovernine.com>";
const TO_EMAIL = "hello@nineovernine.com";
// Far above any valid submission: the field caps total about 10 KB
const MAX_BODY_BYTES = 64 * 1024;

// The Resend constructor throws without an API key, so create it on first send
// rather than when the module loads.
let resendClient: Resend | null = null;
const getResend = () => (resendClient ??= new Resend(process.env.RESEND_API_KEY));

// The durable limit is the Vercel Firewall rule "Rate limit contact form" (10 POSTs
// per hour per IP, across instances). This per-instance limiter counts only sends
// that passed validation (3 per hour) and also covers local and non-Vercel runs.
const submissions = new Map<string, number[]>();
const RATE_LIMIT = 3;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour
// Past this many tracked IPs, expired entries are swept so the map stays bounded
const MAX_TRACKED_IPS = 10_000;
// The form sends a UUID; anything else is ignored rather than passed to Resend
const SUBMISSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function liveTimestamps(ip: string, now: number): number[] {
  return submissions.get(ip)?.filter((t) => now - t < RATE_WINDOW) ?? [];
}

function pruneExpired(now: number) {
  for (const ip of submissions.keys()) {
    const live = liveTimestamps(ip, now);
    if (live.length === 0) submissions.delete(ip);
    else submissions.set(ip, live);
  }
}

function isRateLimited(ip: string): boolean {
  return liveTimestamps(ip, Date.now()).length >= RATE_LIMIT;
}

/** Re-checks the limit and records the submission in one synchronous step, so concurrent requests cannot overshoot it. */
function tryRecordSubmission(ip: string): boolean {
  const now = Date.now();
  if (submissions.size >= MAX_TRACKED_IPS) pruneExpired(now);
  const timestamps = liveTimestamps(ip, now);
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  submissions.set(ip, timestamps);
  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Collapses whitespace (CR and LF included) so a value stays on one header line. */
function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Reads the body as text, or returns null once it passes MAX_BODY_BYTES, so a chunked request is never buffered whole. */
async function readCappedBody(req: NextRequest): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

/** Logs why a submission was refused. Only the reason is logged: never the visitor's input or address. */
function logRejected(reason: string) {
  console.warn(`[Contact Form] Rejected: ${reason}`);
}

const tooManyRequests = () => {
  logRejected("rate limited");
  return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
};
const invalidRequest = (status = 400) => {
  logRejected(`invalid request (${status})`);
  return NextResponse.json({ error: "Invalid request." }, { status });
};
const invalidField = (error: string) => {
  logRejected(`validation: ${error}`);
  return NextResponse.json({ error }, { status: 400 });
};
const sendFailed = () =>
  NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) return tooManyRequests();

  // JSON only: a cross-site HTML form cannot send this content type without a CORS preflight
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) return invalidRequest(415);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return invalidRequest(413);

  // A chunked request carries no Content-Length, so the read itself stops at the cap
  let raw: string | null;
  try {
    raw = await readCappedBody(req);
  } catch {
    return invalidRequest();
  }
  if (raw === null) return invalidRequest(413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return invalidRequest();
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return invalidRequest();

  const { name, email, services, message, _honey, submissionId } = body as Record<string, unknown>;

  if (_honey) {
    // Silently accept to not tip off bots
    logRejected("honeypot");
    return NextResponse.json({ ok: true });
  }

  if (typeof name !== "string" || name.trim().length < MIN_NAME_LENGTH) {
    return invalidField(`Name is required (min ${MIN_NAME_LENGTH} characters).`);
  }
  if (name.length > MAX_NAME_LENGTH) {
    return invalidField("Name is too long.");
  }
  if (typeof email !== "string" || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return invalidField("A valid email is required.");
  }
  if (
    !Array.isArray(services) ||
    services.length === 0 ||
    !services.every((s): s is string => typeof s === "string" && SERVICE_OPTIONS.has(s))
  ) {
    return invalidField("Please select at least one service.");
  }
  if (typeof message !== "string" || message.trim().length < MIN_MESSAGE_LENGTH) {
    return invalidField(`Message is required (min ${MIN_MESSAGE_LENGTH} characters).`);
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return invalidField("Message is too long.");
  }

  if (!tryRecordSubmission(ip)) return tooManyRequests();

  const trimmedName = name.trim();
  const trimmedMessage = message.trim();
  // A crafted request can repeat a service; list each once
  const serviceList = Array.from(new Set(services)).join(", ");
  const idempotencyKey =
    typeof submissionId === "string" && SUBMISSION_ID_RE.test(submissionId)
      ? `contact/${submissionId}`
      : undefined;

  try {
    const { error: sendError } = await getResend().emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject: `New inquiry from ${singleLine(trimmedName)}`,
      text: [
        `Name: ${trimmedName}`,
        `Email: ${email}`,
        `Services: ${serviceList}`,
        "",
        "Message:",
        trimmedMessage,
      ].join("\n"),
      html: `
        <h2>New contact form submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(trimmedName)}</p>
        <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        <p><strong>Services:</strong> ${escapeHtml(serviceList)}</p>
        <h3>Message</h3>
        <p>${escapeHtml(trimmedMessage).replace(/\n/g, "<br>")}</p>
        <hr>
        <p style="color: #999; font-size: 12px;">Sent via nineovernine.com contact form</p>
      `,
    }, { idempotencyKey });

    if (sendError) {
      console.error("[Contact Form] Resend error:", sendError);
      return sendFailed();
    }
  } catch (err) {
    console.error("[Contact Form] Resend request failed:", err);
    return sendFailed();
  }

  return NextResponse.json({ ok: true });
}
