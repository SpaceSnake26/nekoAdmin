"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Suchen…",
  emptyLabel = "Nichts gefunden",
  className,
}: {
  options: SearchSelectOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 20);
    const q = query.toLowerCase();
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.sublabel?.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [options, query]);

  if (selected) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm",
          className,
        )}
      >
        <Check className="size-3.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="truncate">{selected.label}</div>
          {selected.sublabel ? (
            <div className="text-[11px] text-muted-foreground truncate">
              {selected.sublabel}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          className="opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Auswahl aufheben"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>
      {open && query.trim() ? (
        <div className="absolute z-50 mt-1 left-0 right-0 max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">
              {emptyLabel}
            </div>
          ) : (
            <ul>
              {filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(o.id);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <div className="truncate">{o.label}</div>
                    {o.sublabel ? (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {o.sublabel}
                      </div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
