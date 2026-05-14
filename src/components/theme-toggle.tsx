"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";

const OPTIONS = [
  { value: "light", label: "Hell", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dunkel", icon: Moon },
] as const;

/**
 * Segmented light/system/dark switcher used in /settings.
 * Render-blocked until mounted to avoid SSR/CSR mismatch on the active state.
 */
export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-muted/40">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = mounted && theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors ${
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" strokeWidth={1.75} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact icon-only toggle for the topbar — single click cycles light → dark → light.
 */
export function ThemeIconToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Hell-Modus" : "Dunkel-Modus"}
      className="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors active:scale-[0.96]"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-4" strokeWidth={1.75} />
        ) : (
          <Moon className="size-4" strokeWidth={1.75} />
        )
      ) : (
        <Sun className="size-4 opacity-0" strokeWidth={1.75} />
      )}
    </button>
  );
}
