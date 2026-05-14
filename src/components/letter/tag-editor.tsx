"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addTagToLetter,
  removeTagFromLetter,
  suggestTags,
} from "@/server/actions/tag-actions";

interface TagChip {
  id: string;
  name: string;
  color: string | null;
  kind: string;
}

const TAG_TONES: Record<string, string> = {
  rose: "bg-rose-500/15 text-rose-400 dark:text-rose-300",
  amber: "bg-amber-500/15 text-amber-500 dark:text-amber-400",
  blue: "bg-blue-500/15 text-blue-400 dark:text-blue-300",
  violet: "bg-violet-500/15 text-violet-400 dark:text-violet-300",
  teal: "bg-teal-500/15 text-teal-400 dark:text-teal-300",
  cyan: "bg-cyan-500/15 text-cyan-400 dark:text-cyan-300",
  pink: "bg-pink-500/15 text-pink-400 dark:text-pink-300",
  stone: "bg-stone-500/15 text-stone-500 dark:text-stone-400",
  emerald: "bg-emerald-500/15 text-emerald-400 dark:text-emerald-300",
};

function chipClasses(tag: TagChip): string {
  if (tag.kind === "auto") {
    return "bg-muted text-muted-foreground";
  }
  return tag.color && TAG_TONES[tag.color]
    ? TAG_TONES[tag.color]
    : "bg-primary/15 text-primary";
}

export function TagEditor({
  letterId,
  initialTags,
}: {
  letterId: string;
  initialTags: TagChip[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TagChip[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Live suggestions from server
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    suggestTags(query, 12).then((items) => {
      if (cancelled) return;
      const existingNames = new Set(initialTags.map((t) => t.name));
      setSuggestions(
        items
          .map((t) => ({
            id: t.id,
            name: t.name,
            color: t.color,
            kind: "manual",
          }))
          .filter((t) => !existingNames.has(t.name)),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [query, open, initialTags]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      try {
        await addTagToLetter(letterId, trimmed);
        toast.success(`Tag "${trimmed}" hinzugefügt`);
        setQuery("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleRemove(tag: TagChip) {
    if (tag.kind === "auto") {
      toast.info("Auto-Tags können nicht manuell entfernt werden");
      return;
    }
    startTransition(async () => {
      try {
        await removeTagFromLetter(letterId, tag.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    });
  }

  const showCreateOption =
    query.trim().length > 0 &&
    !suggestions.some((s) => s.name === query.trim().toLowerCase()) &&
    !initialTags.some((t) => t.name === query.trim().toLowerCase());

  return (
    <div className="flex flex-wrap gap-1.5 items-center" ref={containerRef}>
      {initialTags.map((tag) => (
        <span
          key={tag.id}
          className={`group/tag inline-flex items-center text-[11px] px-2 py-0.5 rounded-sm ${chipClasses(tag)}`}
        >
          {tag.name.replace(/^auto:/, "")}
          {tag.kind !== "auto" ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleRemove(tag)}
              className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
              title="Tag entfernen"
            >
              <X className="size-2.5" strokeWidth={2.5} />
            </button>
          ) : null}
        </span>
      ))}

      <div className="relative">
        {!open ? (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-sm bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="size-3" strokeWidth={2} />
            Tag
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (suggestions.length > 0 && !showCreateOption) {
                    handleAdd(suggestions[0].name);
                  } else if (query.trim()) {
                    handleAdd(query.trim());
                  }
                } else if (e.key === "Escape") {
                  setOpen(false);
                  setQuery("");
                }
              }}
              placeholder="Tag-Name…"
              className="h-6 w-32 px-2 text-[11px] bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}

        {open ? (
          <div className="absolute top-full left-0 mt-1 z-30 w-56 max-h-72 overflow-auto bg-popover border border-border rounded-md shadow-lg py-1">
            {suggestions.length === 0 && !showCreateOption ? (
              <div className="px-3 py-2 text-[11px] text-muted-foreground">
                Tippe um zu suchen oder neuen Tag zu erstellen
              </div>
            ) : null}
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={isPending}
                onClick={() => handleAdd(s.name)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted/60 flex items-center gap-2 transition-colors"
              >
                <span
                  className={`size-2 rounded-full ${s.color && TAG_TONES[s.color] ? TAG_TONES[s.color].split(" ")[0] : "bg-primary"}`}
                />
                {s.name}
              </button>
            ))}
            {showCreateOption ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleAdd(query.trim())}
                className="w-full text-left px-3 py-1.5 text-xs border-t border-border hover:bg-muted/60 flex items-center gap-2 text-primary transition-colors"
              >
                <Plus className="size-3" strokeWidth={2.5} />
                Neu erstellen: <span className="font-medium">"{query.trim()}"</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
