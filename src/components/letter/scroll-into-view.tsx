"use client";

import { useEffect, useRef } from "react";

/**
 * Scrolls itself into view (in the nearest scrollable ancestor) once on mount.
 * Used to anchor the user's eye to the "current letter" position in long timelines.
 */
export function ScrollIntoViewOnMount({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
