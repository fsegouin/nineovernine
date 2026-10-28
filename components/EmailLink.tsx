"use client";

import { trackEvent } from "@/lib/analytics";

export function EmailLink({
  email,
  location,
  className,
}: {
  email: string;
  location: "contact" | "footer";
  className?: string;
}) {
  return (
    <a
      href={`mailto:${email}`}
      className={className}
      onClick={() => trackEvent("email_link_clicked", { location })}
    >
      {email}
    </a>
  );
}
