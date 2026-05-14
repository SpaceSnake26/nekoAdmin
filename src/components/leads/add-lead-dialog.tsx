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
import { createLeadAction } from "@/server/actions/leads-actions";

export function AddLeadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    pharmacy_name: "",
    contact_name: "",
    email: "",
    phone: "",
    website_url: "",
    city: "",
    has_webshop: false,
    has_ai_products: false,
    has_ai_chatbot: false,
    notes: "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createLeadAction({
          ...form,
          tags: [],
          status: "NEW",
          contact_name: form.contact_name || null,
          email: form.email || null,
          phone: form.phone || null,
          notes: form.notes || null,
        });
        toast.success(`Lead "${form.pharmacy_name}" angelegt`);
        setOpen(false);
        setForm({
          pharmacy_name: "",
          contact_name: "",
          email: "",
          phone: "",
          website_url: "",
          city: "",
          has_webshop: false,
          has_ai_products: false,
          has_ai_chatbot: false,
          notes: "",
        });
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="size-4" />
        Lead anlegen
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neuer Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Row>
            <Field label="Apotheke" required>
              <Input
                value={form.pharmacy_name}
                onChange={(e) =>
                  setForm({ ...form, pharmacy_name: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Ort" required>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </Field>
          </Row>
          <Field label="Website" required>
            <Input
              type="url"
              placeholder="https://"
              value={form.website_url}
              onChange={(e) =>
                setForm({ ...form, website_url: e.target.value })
              }
              required
            />
          </Field>
          <Row>
            <Field label="Ansprechpartner">
              <Input
                value={form.contact_name}
                onChange={(e) =>
                  setForm({ ...form, contact_name: e.target.value })
                }
              />
            </Field>
            <Field label="E-Mail">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
          </Row>
          <Field label="Telefon">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <div className="flex gap-6 text-sm">
            <Checkbox
              checked={form.has_webshop}
              onChange={(v) => setForm({ ...form, has_webshop: v })}
              label="Webshop"
            />
            <Checkbox
              checked={form.has_ai_products}
              onChange={(v) => setForm({ ...form, has_ai_products: v })}
              label="KI-Produkte"
            />
            <Checkbox
              checked={form.has_ai_chatbot}
              onChange={(v) => setForm({ ...form, has_ai_chatbot: v })}
              label="KI-Chatbot"
            />
          </div>
          <Field label="Notizen">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
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

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
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

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-border"
      />
      <span>{label}</span>
    </label>
  );
}
