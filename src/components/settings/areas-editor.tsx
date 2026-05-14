"use client";

import { Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createArea,
  deleteArea,
  toggleAreaHidden,
  updateArea,
} from "@/server/actions/area-actions";

interface AreaRow {
  code: string;
  label: string;
  color: string | null;
  description: string | null;
  senderPatterns: string[];
  isHidden: boolean;
  sortOrder: number;
  letterCount: number;
}

export function AreasEditor({ areas }: { areas: AreaRow[] }) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <ul className="divide-y divide-border border border-border rounded-md overflow-hidden">
        {areas.map((a) => (
          <AreaRowView key={a.code} area={a} />
        ))}
      </ul>
      <div className="mt-3">
        {showCreate ? (
          <CreateAreaForm onDone={() => setShowCreate(false)} />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="size-3.5 mr-1.5" strokeWidth={1.75} />
            Neuer Bereich
          </Button>
        )}
      </div>
    </div>
  );
}

function AreaRowView({ area }: { area: AreaRow }) {
  const [edit, setEdit] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState(area.label);
  const [description, setDescription] = useState(area.description ?? "");
  const [patternsText, setPatternsText] = useState(
    area.senderPatterns.join(", "),
  );

  function save() {
    startTransition(async () => {
      try {
        const patterns = patternsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        await updateArea(area.code, { label, description, senderPatterns: patterns });
        toast.success(`Bereich '${area.code}' aktualisiert`);
        setEdit(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function toggleHidden() {
    startTransition(async () => {
      await toggleAreaHidden(area.code);
      toast.success(area.isHidden ? "Aktiviert" : "Versteckt");
    });
  }

  function remove() {
    if (!confirm(`Bereich '${area.code}' wirklich löschen? ${area.letterCount} Briefe verlieren ihren Bereich.`)) return;
    startTransition(async () => {
      try {
        await deleteArea(area.code);
        toast.success("Bereich gelöscht");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <li className={`px-4 py-3 ${area.isHidden ? "opacity-50" : ""}`}>
      {!edit ? (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{area.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {area.code}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                · {area.letterCount}{" "}
                {area.letterCount === 1 ? "Brief" : "Briefe"}
              </span>
            </div>
            {area.description ? (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {area.description}
              </p>
            ) : null}
            {area.senderPatterns.length > 0 ? (
              <div className="text-[11px] text-muted-foreground mt-1.5 flex flex-wrap gap-1">
                <span className="text-muted-foreground/60">Patterns:</span>
                {area.senderPatterns.map((p) => (
                  <span
                    key={p}
                    className="font-mono px-1.5 py-0.5 bg-muted/60 rounded-sm"
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleHidden}
              disabled={isPending}
              title={area.isHidden ? "Aktivieren" : "Verstecken"}
              className="size-7 rounded hover:bg-muted/70 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {area.isHidden ? (
                <Eye className="size-3.5" strokeWidth={1.75} />
              ) : (
                <EyeOff className="size-3.5" strokeWidth={1.75} />
              )}
            </button>
            <button
              type="button"
              onClick={() => setEdit(true)}
              disabled={isPending}
              title="Bearbeiten"
              className="size-7 rounded hover:bg-muted/70 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="size-3.5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              title="Löschen"
              className="size-7 rounded hover:bg-destructive/10 inline-flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="size-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground w-16">
              {area.code}
            </span>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Anzeige-Name"
              className="h-8 text-sm flex-1"
            />
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Beschreibung (optional)"
            rows={2}
            className="text-xs"
          />
          <Input
            value={patternsText}
            onChange={(e) => setPatternsText(e.target.value)}
            placeholder="Sender-Patterns, kommagetrennt: AKSO, Ausgleichskasse, …"
            className="h-8 text-sm font-mono"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setEdit(false)}>
              <X className="size-3.5 mr-1" /> Abbrechen
            </Button>
            <Button size="sm" onClick={save} disabled={isPending}>
              Speichern
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function CreateAreaForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [patternsText, setPatternsText] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      try {
        const patterns = patternsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        await createArea({
          code,
          label: label || code,
          description: description || undefined,
          senderPatterns: patterns,
        });
        toast.success(`Bereich '${code}' angelegt`);
        onDone();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="border border-border rounded-md p-4 bg-muted/30 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code (z.B. immobilien)"
          className="h-8 text-sm font-mono"
        />
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (z.B. Immobilien)"
          className="h-8 text-sm"
        />
      </div>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Kurze Beschreibung"
        rows={2}
        className="text-xs"
      />
      <Input
        value={patternsText}
        onChange={(e) => setPatternsText(e.target.value)}
        placeholder="Sender-Patterns: Hauswart, Verwaltung, ..."
        className="h-8 text-sm font-mono"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>
          Abbrechen
        </Button>
        <Button size="sm" onClick={submit} disabled={isPending || !code}>
          Anlegen
        </Button>
      </div>
    </div>
  );
}
