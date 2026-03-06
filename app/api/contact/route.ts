import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Nine Over Nine <hello@contact.nineovernine.com>";
const TO_EMAIL = "hello@nineovernine.com";

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

  const trimmedName = name.trim();
  const trimmedMessage = message.trim();

  const { error: sendError } = await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    replyTo: email,
    subject: `New inquiry from ${trimmedName}`,
    text: [
      `Name: ${trimmedName}`,
      `Email: ${email}`,
      `Services: ${services.join(", ")}`,
      "",
      "Message:",
      trimmedMessage,
    ].join("\n"),
    html: `
      <h2>New contact form submission</h2>
      <p><strong>Name:</strong> ${trimmedName}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Services:</strong> ${services.join(", ")}</p>
      <h3>Message</h3>
      <p>${trimmedMessage.replace(/\n/g, "<br>")}</p>
      <hr>
      <p style="color: #999; font-size: 12px;">Sent via nineovernine.com contact form</p>
    `,
  });

  if (sendError) {
    console.error("[Contact Form] Resend error:", sendError);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
