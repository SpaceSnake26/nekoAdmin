"use client";

import { Plus, Sparkles, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  applySenderDefaultTagsRetroactively,
  setSenderDefaultTags,
} from "@/server/actions/tag-actions";

export function SenderTagEditor({
  senderId,
  initialTags,
  letterCount,
}: {
  senderId: string;
  initialTags: string[];
  letterCount: number;
}) {
  const [tags, setTags] = useState(initialTags);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  function addTag() {
    const t = draft.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t || tags.includes(t)) {
      setDraft("");
      return;
    }
    const next = [...tags, t];
    setTags(next);
    setDraft("");
    startTransition(async () => {
      try {
        await setSenderDefaultTags(senderId, next);
      } catch (e) {
        setTags(tags); // rollback
        toast.error(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function removeTag(name: string) {
    const next = tags.filter((t) => t !== name);
    setTags(next);
    startTransition(async () => {
      try {
        await setSenderDefaultTags(senderId, next);
      } catch (e) {
        setTags(tags);
        toast.error(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function applyToAll() {
    if (
      !confirm(
        `Tags ${tags.map((t) => `"${t}"`).join(", ")} auf alle ${letterCount} Briefe von diesem Sender anwenden?`,
      )
    )
      return;
    startTransition(async () => {
      try {
        await applySenderDefaultTagsRetroactively(senderId);
        toast.success(`Tags auf ${letterCount} bestehende Briefe angewendet`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1 items-center">
        {tags.length === 0 ? (
          <span className="text-[11px] text-muted-foreground italic">keine</span>
        ) : (
          tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                disabled={isPending}
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="size-2.5" strokeWidth={2.5} />
              </button>
            </span>
          ))
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder="+ Tag"
          className="h-5 w-20 px-1.5 text-[10px] bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      {tags.length > 0 && letterCount > 0 ? (
        <button
          type="button"
          onClick={applyToAll}
          disabled={isPending}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Sparkles className="size-2.5" strokeWidth={2} />
          Auf alle {letterCount} bestehenden anwenden
        </button>
      ) : null}
    </div>
  );
}
