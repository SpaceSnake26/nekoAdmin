"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadAction } from "@/server/actions/leads-actions";

type Saver = (value: unknown) => Promise<unknown>;

function buildSaver(leadId: string, field: string): Saver {
  return async (value: unknown) => {
    return updateLeadAction(leadId, { [field]: value });
  };
}

function useSaveOnChange(
  leadId: string,
  field: string,
  onSuccess?: () => void,
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function save(value: unknown) {
    startTransition(async () => {
      try {
        await buildSaver(leadId, field)(value);
        onSuccess?.();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return { pending, save };
}

// ---------- text / email / url / phone ----------

export function EditableText({
  leadId,
  field,
  initial,
  type = "text",
  placeholder,
  link,
  mono,
}: {
  leadId: string;
  field: string;
  initial: string | null;
  type?: "text" | "email" | "url" | "tel";
  placeholder?: string;
  link?: boolean;
  mono?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const { pending, save } = useSaveOnChange(leadId, field, () =>
    setEditing(false),
  );

  useEffect(() => setValue(initial ?? ""), [initial]);

  function commit() {
    const next = value.trim();
    if ((next || null) === (initial ?? null)) {
      setEditing(false);
      return;
    }
    save(next ? next : null);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          type={type}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setValue(initial ?? "");
              setEditing(false);
            }
          }}
          placeholder={placeholder}
          disabled={pending}
          className={mono ? "font-mono" : ""}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group flex items-center gap-2 text-left w-full hover:bg-muted/40 rounded-sm px-1 -mx-1 py-0.5 transition-colors cursor-text"
      aria-label="Bearbeiten"
    >
      <span
        className={`flex-1 min-w-0 truncate ${
          initial
            ? mono
              ? "font-mono tabular-nums text-foreground"
              : link
                ? "text-sky-600 dark:text-sky-400 underline-offset-2 group-hover:underline"
                : "text-foreground"
            : "text-muted-foreground italic"
        }`}
      >
        {initial || (placeholder ?? "—")}
      </span>
      <Pencil className="size-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-opacity" />
    </button>
  );
}

// ---------- textarea ----------

export function EditableNotes({
  leadId,
  initial,
}: {
  leadId: string;
  initial: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const { pending, save } = useSaveOnChange(leadId, "notes", () =>
    setEditing(false),
  );

  useEffect(() => setValue(initial ?? ""), [initial]);

  function commit() {
    const next = value.trim();
    if ((next || null) === (initial ?? null)) {
      setEditing(false);
      return;
    }
    save(next ? next : null);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          rows={4}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setValue(initial ?? "");
              setEditing(false);
            }
          }}
          disabled={pending}
        />
        <p className="text-[10px] text-muted-foreground">
          Esc abbrechen · Klick ausserhalb speichert
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group block w-full text-left rounded-sm hover:bg-muted/40 px-1 -mx-1 py-1 transition-colors cursor-text"
    >
      {initial ? (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
          {initial}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          Notizen hinzufügen…
        </p>
      )}
    </button>
  );
}

// ---------- boolean toggle ----------

export function EditableBool({
  leadId,
  field,
  initial,
  trueLabel = "Ja",
  falseLabel = "Nein",
}: {
  leadId: string;
  field: string;
  initial: boolean | null;
  trueLabel?: string;
  falseLabel?: string;
}) {
  const { pending, save } = useSaveOnChange(leadId, field);
  const v = Boolean(initial);
  return (
    <button
      type="button"
      onClick={() => save(!v)}
      disabled={pending}
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium transition-all ${
        v
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_-2px_rgba(16,185,129,0.4)]"
          : "bg-muted text-muted-foreground border border-border hover:border-foreground/30"
      }`}
      aria-pressed={v}
    >
      {v ? <Check className="size-3.5" /> : null}
      {v ? trueLabel : falseLabel}
    </button>
  );
}

// ---------- select ----------

export function EditableSelect({
  leadId,
  field,
  initial,
  options,
  glow,
}: {
  leadId: string;
  field: string;
  initial: string | null;
  options: { value: string; label: string; tone?: "sky" | "amber" | "emerald" | "muted" }[];
  glow?: boolean;
}) {
  const { pending, save } = useSaveOnChange(leadId, field);
  const current = options.find((o) => o.value === initial) ?? null;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    save(e.target.value || null);
  }

  const tone = current?.tone ?? "muted";
  const toneCls: Record<typeof tone, string> = {
    sky: "border-sky-500/40 text-sky-700 dark:text-sky-400 bg-sky-500/10",
    amber:
      "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10",
    emerald:
      "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10",
    muted: "border-border bg-background text-foreground",
  };
  const glowCls = glow
    ? tone === "sky"
      ? "shadow-[0_0_14px_-2px_rgba(14,165,233,0.45)]"
      : tone === "amber"
        ? "shadow-[0_0_14px_-2px_rgba(245,158,11,0.45)]"
        : tone === "emerald"
          ? "shadow-[0_0_14px_-2px_rgba(16,185,129,0.45)]"
          : ""
    : "";

  return (
    <select
      value={initial ?? ""}
      onChange={onChange}
      disabled={pending}
      className={`h-9 rounded-md border text-sm font-medium px-3 outline-none cursor-pointer transition-all focus-visible:ring-3 focus-visible:ring-ring/40 ${toneCls[tone]} ${glowCls}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-background">
          {o.label}
        </option>
      ))}
    </select>
  );
}
