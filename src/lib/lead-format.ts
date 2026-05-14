import type { LeadStatus } from "@/server/db/schema";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Neu",
  CONTACTED: "Kontaktiert",
  REPLIED: "Beantwortet",
  QUALIFIED: "Qualifiziert",
  WON: "Gewonnen",
  LOST: "Verloren",
};

export function leadStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return LEAD_STATUS_LABELS[status as LeadStatus] ?? status;
}

export const LEAD_STATUS_TONE: Record<LeadStatus, "default" | "warn" | "success" | "danger" | "muted"> = {
  NEW: "default",
  CONTACTED: "warn",
  REPLIED: "warn",
  QUALIFIED: "success",
  WON: "success",
  LOST: "muted",
};
