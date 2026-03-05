import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter (IP-based, 3 submissions per hour)
const submissions = new Map<string, number[]>();
const RATE_LIMIT = 3;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = submissions.get(ip)?.filter((t) => now - t < RATE_WINDOW) ?? [];
  submissions.set(ip, timestamps);
  return timestamps.length >= RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { name, email, services, message, _honey } = body as {
    name?: string;
    email?: string;
    services?: string[];
    message?: string;
    _honey?: string;
  };

  // Honeypot check
  if (_honey) {
    // Silently accept to not tip off bots
    return NextResponse.json({ ok: true });
  }

  // Validate
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Name is required (min 2 characters)." }, { status: 400 });
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRe.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  if (!Array.isArray(services) || services.length === 0) {
    return NextResponse.json({ error: "Please select at least one service." }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.trim().length < 10) {
    return NextResponse.json({ error: "Message is required (min 10 characters)." }, { status: 400 });
  }

  // Record the submission for rate limiting
  const now = Date.now();
  const timestamps = submissions.get(ip) ?? [];
  timestamps.push(now);
  submissions.set(ip, timestamps);

  // TODO: Integrate Resend or another email provider here.
  // For now, log the submission. Replace with actual email sending
  // once RESEND_API_KEY is configured.
  console.log("[Contact Form]", { name: name.trim(), email, services, message: message.trim(), ip });

  return NextResponse.json({ ok: true });
}
