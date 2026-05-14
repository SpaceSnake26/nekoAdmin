import Link from "next/link";
import { LayoutGrid, Rows3 } from "lucide-react";

export function ViewToggle({
  current,
  buildUrl,
}: {
  current: "list" | "cards";
  buildUrl: (view: "list" | "cards") => string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-muted/40">
      <Toggle
        href={buildUrl("list")}
        active={current === "list"}
        label="Liste"
        icon={<Rows3 className="size-3.5" strokeWidth={1.75} />}
      />
      <Toggle
        href={buildUrl("cards")}
        active={current === "cards"}
        label="Karten"
        icon={<LayoutGrid className="size-3.5" strokeWidth={1.75} />}
      />
    </div>
  );
}

export function GroupToggle({
  current,
  buildUrl,
}: {
  current: "flat" | "by-group";
  buildUrl: (group: "flat" | "by-group") => string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-muted/40">
      <Toggle
        href={buildUrl("flat")}
        active={current === "flat"}
        label="Chronologisch"
        icon={
          <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
          </svg>
        }
      />
      <Toggle
        href={buildUrl("by-group")}
        active={current === "by-group"}
        label="Gruppiert"
        icon={
          <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75}>
            <rect x="2" y="2.5" width="12" height="4" rx="1" strokeLinejoin="round" />
            <rect x="2" y="9" width="12" height="4.5" rx="1" strokeLinejoin="round" />
            <path d="M5 6.5v2.5M11 6.5v2.5" strokeLinecap="round" />
          </svg>
        }
      />
    </div>
  );
}

function Toggle({
  href,
  active,
  label,
  icon,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
