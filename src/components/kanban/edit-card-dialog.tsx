"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { updateKanbanCard } from "@/server/actions/kanban-actions";

interface CardSnapshot {
  id: string;
  title: string;
  notes: string | null;
  columnId: string;
  leadId: string | null;
  eventId: string | null;
  campaignTag: string | null;
  assignee: string | null;
  dueDate: Date | null;
}

function toDateInput(d: Date | null): string {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function EditCardDialog({
  open,
  onOpenChange,
  card,
  columns,
  leadOptions,
  eventOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CardSnapshot;
  columns: { id: string; label: string }[];
  leadOptions: SearchSelectOption[];
  eventOptions: SearchSelectOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: card.title,
    notes: card.notes ?? "",
    columnId: card.columnId,
    leadId: card.leadId,
    eventId: card.eventId,
    campaignTag: card.campaignTag ?? "",
    assignee: card.assignee ?? "",
    dueDate: toDateInput(card.dueDate),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateKanbanCard({
          id: card.id,
          ...form,
          notes: form.notes || null,
          campaignTag: form.campaignTag || null,
          assignee: form.assignee || null,
          dueDate: form.dueDate || null,
        });
        toast.success("Karte gespeichert");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Karte bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Titel" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              autoFocus
            />
          </Field>
          <Field label="Spalte">
            <select
              value={form.columnId}
              onChange={(e) => setForm({ ...form, columnId: e.target.value })}
              className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notizen">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Lead verknüpfen">
              <SearchSelect
                options={leadOptions}
                value={form.leadId}
                onChange={(id) => setForm({ ...form, leadId: id })}
                placeholder="Apotheke suchen…"
                emptyLabel="Keine Apotheke gefunden"
              />
            </Field>
            <Field label="Event verknüpfen">
              <SearchSelect
                options={eventOptions}
                value={form.eventId}
                onChange={(id) => setForm({ ...form, eventId: id })}
                placeholder="Event suchen…"
                emptyLabel="Kein Event gefunden"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Kampagne / Tag">
              <Input
                value={form.campaignTag}
                onChange={(e) =>
                  setForm({ ...form, campaignTag: e.target.value })
                }
                placeholder="z.B. cold-1"
              />
            </Field>
            <Field label="Zuständig">
              <Input
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Frist">
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Abbrechen
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Speichern…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}
