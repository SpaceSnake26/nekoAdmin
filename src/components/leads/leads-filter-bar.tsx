"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { LEAD_STATUSES } from "@/server/db/schema";
import { LEAD_STATUS_LABELS } from "@/lib/lead-format";

const SCORE_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "all", label: "Alle" },
  { key: "5", label: "≥ 5" },
  { key: "7", label: "≥ 7" },
  { key: "8", label: "≥ 8" },
];

const BOOL_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "all", label: "Alle" },
  { key: "true", label: "Ja" },
  { key: "false", label: "Nein" },
];

export function LeadsFilterBar() {
  const router = useRouter();
  const params = useSearchParams();

  const status = params.get("status") ?? "all";
  const hasWebshop = params.get("hasWebshop") ?? "all";
  const hasAiChatbot = params.get("hasAiChatbot") ?? "all";
  const minScore = params.get("minScore") ?? "all";
  const initialQ = params.get("q") ?? "";

  const [q, setQ] = useState(initialQ);

  useEffect(() => setQ(initialQ), [initialQ]);

  function build(overrides: Record<string, string | null>): string {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v == null || v === "" || v === "all") next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    return s ? `/leads?${s}` : "/leads";
  }

  function go(overrides: Record<string, string | null>) {
    router.push(build(overrides));
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    go({ q: q.trim() || null });
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={submitSearch}
        className="flex items-center gap-2 border-b border-border pb-3"
      >
        <Search className="size-4 text-muted-foreground" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Apotheke, Ort oder E-Mail suchen…"
          aria-label="Apotheken, Ort oder E-Mail suchen"
          type="search"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {(initialQ || status !== "all" || hasWebshop !== "all" || hasAiChatbot !== "all" || minScore !== "all") ? (
          <button
            type="button"
            onClick={() => router.push("/leads")}
            className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            Filter zurücksetzen
          </button>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-x-8 gap-y-3 items-start text-[12px]">
        <FilterGroup
          label="Status"
          items={[
            { key: "all", label: "Alle", active: status === "all", href: build({ status: null }) },
            ...LEAD_STATUSES.map((s) => ({
              key: s,
              label: LEAD_STATUS_LABELS[s],
              active: status === s,
              href: build({ status: s }),
            })),
          ]}
        />
        <FilterGroup
          label="Webshop"
          items={BOOL_OPTIONS.map((o) => ({
            key: o.key,
            label: o.label,
            active: hasWebshop === o.key,
            href: build({ hasWebshop: o.key === "all" ? null : o.key }),
          }))}
        />
        <FilterGroup
          label="KI-Chatbot"
          items={BOOL_OPTIONS.map((o) => ({
            key: o.key,
            label: o.label,
            active: hasAiChatbot === o.key,
            href: build({ hasAiChatbot: o.key === "all" ? null : o.key }),
          }))}
        />
        <FilterGroup
          label="Score"
          items={SCORE_OPTIONS.map((o) => ({
            key: o.key,
            label: o.label,
            active: minScore === o.key,
            href: build({ minScore: o.key === "all" ? null : o.key }),
          }))}
        />
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  items,
}: {
  label: string;
  items: { key: string; label: string; active: boolean; href: string }[];
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">
        {label}
      </span>
      <div className="flex items-center flex-wrap">
        {items.map((i, idx) => (
          <button
            key={i.key}
            type="button"
            onClick={() => router.push(i.href)}
            className={`px-2.5 py-1 text-xs transition-colors ${
              i.active
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            } ${idx > 0 ? "border-l border-border" : ""}`}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  );
}
