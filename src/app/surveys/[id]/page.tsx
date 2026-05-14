"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WebshopStatus = "Yes" | "No" | "Planned";
type ItManagement = "in-house" | "agency" | "freelancer" | "not sure";
type AiUsage = "None" | "Internal" | "Chatbot" | "Both";

const WEBSHOP_LABELS: Record<WebshopStatus, string> = {
  Yes: "Ja",
  No: "Nein",
  Planned: "Geplant",
};

const IT_MGMT_OPTIONS: Array<{ id: ItManagement; label: string }> = [
  { id: "in-house", label: "Inhouse-Team" },
  { id: "agency", label: "Externe Agentur" },
  { id: "freelancer", label: "Freelancer" },
  { id: "not sure", label: "Nicht sicher" },
];

const AI_USAGE_OPTIONS: Array<{ id: AiUsage; label: string }> = [
  { id: "None", label: "Keine" },
  { id: "Internal", label: "Nur interne Tools" },
  { id: "Chatbot", label: "Öffentlicher Chatbot" },
  { id: "Both", label: "Beides" },
];

const TOTAL_STEPS = 6;

export default function PublicSurveyPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("lead_id");

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    pharmacy_name: "",
    city: "",
    contact_name: "",
    email: "",
    phone: "",
    has_website: true,
    website_satisfaction: 3,
    webshop_status: "No" as WebshopStatus,
    it_management: "not sure" as ItManagement,
    ai_usage: "None" as AiUsage,
    top_priority: "Website refresh",
    consent_accepted: false,
  });

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/surveys/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          survey_id: params.id,
          lead_id: leadId,
          ...form,
        }),
      });
      if (!res.ok) {
        setError("Fehler beim Senden. Bitte Eingaben prüfen.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center space-y-5 border border-border rounded-md p-10 bg-muted/30">
          <div className="size-12 mx-auto rounded-full bg-primary/15 text-primary flex items-center justify-center">
            <CheckCircle2 className="size-6" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight">Vielen Dank</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ihre Antworten wurden gespeichert. Wir melden uns in Kürze mit einer
            individuellen Auswertung für Ihre Apotheke.
          </p>
        </div>
      </div>
    );
  }

  const canNext =
    (step === 1 && Boolean(form.pharmacy_name && form.email)) || step !== 1;

  return (
    <div className="px-8 py-10 max-w-[800px] mx-auto">
      <div className="border-b border-border pb-4 mb-8">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
          Digital-Audit · Apotheke
        </div>
        <h1 className="text-2xl font-medium tracking-tight">
          Wie digital ist Ihre Apotheke?
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Sechs kurze Fragen · ca. 2 Minuten
        </p>
      </div>

      <div className="mb-8">
        <div className="h-px bg-border relative">
          <div
            className="absolute inset-y-0 left-0 bg-foreground transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-2 font-mono tabular-nums">
          Schritt {step} / {TOTAL_STEPS}
        </div>
      </div>

      <div className="min-h-[280px]">
        {step === 1 ? (
          <Section title="Basisdaten">
            <div className="space-y-4">
              <Field label="Name der Apotheke">
                <Input
                  value={form.pharmacy_name}
                  onChange={(e) =>
                    setForm({ ...form, pharmacy_name: e.target.value })
                  }
                  placeholder="z.B. Apotheke Zürich"
                />
              </Field>
              <Field label="Ort">
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="z.B. Zürich"
                />
              </Field>
              <Field label="E-Mail">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ihre@apotheke.ch"
                />
              </Field>
              <Field label="Ansprechpartner (optional)">
                <Input
                  value={form.contact_name}
                  onChange={(e) =>
                    setForm({ ...form, contact_name: e.target.value })
                  }
                />
              </Field>
            </div>
          </Section>
        ) : null}

        {step === 2 ? (
          <Section title="Digitale Präsenz">
            <Field label="Haben Sie eine Website?">
              <div className="grid grid-cols-2 gap-3">
                <OptionButton
                  active={form.has_website}
                  onClick={() => setForm({ ...form, has_website: true })}
                >
                  Ja
                </OptionButton>
                <OptionButton
                  active={!form.has_website}
                  onClick={() => setForm({ ...form, has_website: false })}
                >
                  Nein
                </OptionButton>
              </div>
            </Field>
            {form.has_website ? (
              <Field label="Wie zufrieden sind Sie damit? (1–5)">
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <OptionButton
                      key={n}
                      active={form.website_satisfaction === n}
                      onClick={() =>
                        setForm({ ...form, website_satisfaction: n })
                      }
                    >
                      <span className="font-mono tabular-nums">{n}</span>
                    </OptionButton>
                  ))}
                </div>
              </Field>
            ) : null}
          </Section>
        ) : null}

        {step === 3 ? (
          <Section title="Online-Bestellungen">
            <Field label="Haben Sie einen Webshop?">
              <div className="space-y-2">
                {(Object.keys(WEBSHOP_LABELS) as WebshopStatus[]).map((opt) => (
                  <OptionButton
                    key={opt}
                    active={form.webshop_status === opt}
                    onClick={() => setForm({ ...form, webshop_status: opt })}
                  >
                    {WEBSHOP_LABELS[opt]}
                  </OptionButton>
                ))}
              </div>
            </Field>
          </Section>
        ) : null}

        {step === 4 ? (
          <Section title="IT-Betreuung">
            <Field label="Wer betreut Ihre IT / Website?">
              <div className="space-y-2">
                {IT_MGMT_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt.id}
                    active={form.it_management === opt.id}
                    onClick={() => setForm({ ...form, it_management: opt.id })}
                  >
                    {opt.label}
                  </OptionButton>
                ))}
              </div>
            </Field>
          </Section>
        ) : null}

        {step === 5 ? (
          <Section title="KI-Einsatz">
            <Field label="Nutzen Sie aktuell KI oder Chatbots?">
              <div className="space-y-2">
                {AI_USAGE_OPTIONS.map((opt) => (
                  <OptionButton
                    key={opt.id}
                    active={form.ai_usage === opt.id}
                    onClick={() => setForm({ ...form, ai_usage: opt.id })}
                  >
                    {opt.label}
                  </OptionButton>
                ))}
              </div>
            </Field>
          </Section>
        ) : null}

        {step === 6 ? (
          <Section title="Datenschutz & Einwilligung">
            <div className="text-sm text-muted-foreground leading-relaxed border border-border rounded-md p-4 bg-muted/30">
              Mit dem Absenden willigen Sie ein, dass Ihre Angaben zur Erstellung
              eines individuellen Digital-Reports verwendet werden. Die
              Speicherung erfolgt gemäss Schweizer DSG.
            </div>
            <label className="flex items-center gap-3 cursor-pointer mt-4">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={form.consent_accepted}
                onChange={(e) =>
                  setForm({ ...form, consent_accepted: e.target.checked })
                }
              />
              <span className="text-sm">Ich stimme der Datenverarbeitung zu.</span>
            </label>
          </Section>
        ) : null}
      </div>

      {error ? (
        <div className="mt-6 text-xs text-destructive">{error}</div>
      ) : null}

      <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
        >
          <ChevronLeft className="size-4" />
          Zurück
        </Button>
        {step < TOTAL_STEPS ? (
          <Button
            onClick={() => setStep(Math.min(TOTAL_STEPS, step + 1))}
            disabled={!canNext}
          >
            Weiter
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!form.consent_accepted || loading}
          >
            <Send className="size-4" />
            {loading ? "Wird gesendet…" : "Absenden"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <h2 className="text-sm font-medium tracking-tight text-foreground/90 pb-2 border-b border-border">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-md border text-sm transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:bg-muted/40"
      }`}
    >
      {children}
    </button>
  );
}
