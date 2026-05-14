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
import {
  EVENT_LOCATIONS,
  EVENT_LOCATION_LABELS,
  type EventLocation,
} from "@/server/db/schema";
import { createEventAction } from "@/server/actions/events-actions";

export function AddEventDialog({
  defaultLocation,
}: {
  defaultLocation?: EventLocation;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    locationCode: (defaultLocation ?? "zurich") as EventLocation,
    city: "",
    venue: "",
    startsAt: "",
    endsAt: "",
    url: "",
    description: "",
    tags: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createEventAction({
          ...form,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          city: form.city || null,
          venue: form.venue || null,
          endsAt: form.endsAt || null,
          url: form.url || null,
          description: form.description || null,
        });
        toast.success("Event angelegt");
        setForm({
          title: "",
          locationCode: (defaultLocation ?? "zurich") as EventLocation,
          city: "",
          venue: "",
          startsAt: "",
          endsAt: "",
          url: "",
          description: "",
          tags: "",
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="size-4" />
        Event anlegen
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neues IT-Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Titel" required>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Region" required>
              <select
                value={form.locationCode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    locationCode: e.target.value as EventLocation,
                  })
                }
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3 outline-none"
              >
                {EVENT_LOCATIONS.map((l) => (
                  <option key={l} value={l}>
                    {EVENT_LOCATION_LABELS[l]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stadt (frei)">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="z.B. Olten"
              />
            </Field>
          </div>
          <Field label="Venue">
            <Input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start" required>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) =>
                  setForm({ ...form, startsAt: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Ende">
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </Field>
          </div>
          <Field label="URL">
            <Input
              type="url"
              placeholder="https://"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </Field>
          <Field label="Beschreibung">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          <Field label="Tags (komma-getrennt)">
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="ai, b2b, pharma"
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
