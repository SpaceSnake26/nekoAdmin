"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface Props {
  name: string;
  subject: string;
  body: string;
}

export function TemplateCard({ name, subject, body }: Props) {
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  function copy(value: string, kind: "subject" | "body") {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(kind);
        toast.success(kind === "subject" ? "Betreff kopiert" : "Text kopiert");
        setTimeout(() => setCopied(null), 1500);
      },
      () => toast.error("Konnte nicht kopieren"),
    );
  }

  return (
    <article className="border border-border rounded-md overflow-hidden">
      <header className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium tracking-tight">{name}</h3>
      </header>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Betreff
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(subject, "subject")}
            >
              {copied === "subject" ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              Kopieren
            </Button>
          </div>
          <div className="text-sm font-mono bg-muted/30 px-3 py-2 rounded-sm break-all">
            {subject}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Text
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(body, "body")}
            >
              {copied === "body" ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
              Kopieren
            </Button>
          </div>
          <pre className="text-xs font-sans whitespace-pre-wrap bg-muted/30 px-3 py-2 rounded-sm leading-relaxed text-foreground/90">
            {body}
          </pre>
        </div>
      </div>
    </article>
  );
}
