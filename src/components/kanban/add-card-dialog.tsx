"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect, type SearchSelectOption } from "@/components/ui/search-select";
import { createKanbanCard } from "@/server/actions/kanban-actions";

export function AddCardDialog({
  columns,
  leadOptions,
  eventOptions,
  defaultColumnId,
  trigger,
}: {
  columns: { id: string; label: string }[];
  leadOptions: SearchSelectOption[];
  eventOptions: SearchSelectOption[];
  defaultColumnId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const initial = () => ({
    columnId: defaultColumnId ?? columns[0]?.id ?? "",
    title: "",
    notes: "",
    leadId: null as string | null,
    eventId: null as string | null,
    campaignTag: "",
    assignee: "",
    dueDate: "",
  });
  const [form, setForm] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createKanbanCard({
          ...form,
          notes: form.notes || null,
          campaignTag: form.campaignTag || null,
          assignee: form.assignee || null,
          dueDate: form.dueDate || null,
        });
        toast.success("Karte angelegt");
        setForm(initial());
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button variant="outline" />
          )
        }
      >
        {trigger ? null : (
          <>
            <Plus className="size-4" />
            Karte
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neue Karte</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Titel" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
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
              {pending ? "Speichern…" : "Anlegen"}
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
