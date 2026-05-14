"use client";

import {
  CheckCheck,
  Construction,
  FlaskConical,
  Flame,
  Hammer,
  Truck,
} from "lucide-react";

// Tiny ambient illustration per column. Pure decoration, aria-hidden.
// Animations live in globals.css (anim-flicker / anim-drive / anim-wobble / anim-bubble / anim-celebrate).
export function ColumnIcon({ label }: { label: string }) {
  const key = label.trim().toLowerCase();

  if (key === "urgent") {
    return (
      <span
        aria-hidden
        className="inline-flex items-center text-orange-500 dark:text-orange-400"
      >
        <Flame className="size-4 anim-flicker" strokeWidth={2.5} />
      </span>
    );
  }

  if (key === "backlog") {
    return (
      <span
        aria-hidden
        className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-500"
      >
        <Truck className="size-4 anim-drive" strokeWidth={2} />
        <Construction className="size-3.5 anim-drive-slow" strokeWidth={2} />
      </span>
    );
  }

  if (key === "in progress") {
    return (
      <span
        aria-hidden
        className="inline-flex items-center text-amber-600 dark:text-amber-400"
      >
        <Hammer className="size-4 anim-wobble" strokeWidth={2.25} />
      </span>
    );
  }

  if (key === "testing") {
    return (
      <span
        aria-hidden
        className="inline-flex items-center text-violet-600 dark:text-violet-400"
      >
        <FlaskConical className="size-4 anim-bubble" strokeWidth={2.25} />
      </span>
    );
  }

  if (key === "done") {
    return (
      <span
        aria-hidden
        className="inline-flex items-center text-emerald-600 dark:text-emerald-400"
      >
        <CheckCheck className="size-4 anim-celebrate" strokeWidth={2.5} />
      </span>
    );
  }

  return null;
}
