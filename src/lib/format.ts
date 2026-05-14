import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

const chfFormatter = new Intl.NumberFormat("de-CH", {
  style: "currency",
  currency: "CHF",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatChf(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return chfFormatter.format(amount);
}

export function formatAmount(
  amount: number | null | undefined,
  currency = "CHF",
): string {
  if (amount == null) return "—";
  if (currency === "CHF") return chfFormatter.format(amount);
  try {
    return new Intl.NumberFormat("de-CH", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateShort(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatRelative(d: Date | null | undefined): string {
  if (!d) return "—";
  return formatDistanceToNow(d, { addSuffix: true, locale: de });
}

export function shortId(id: string): string {
  return id.slice(0, 6);
}

export function categoryLabel(c: string | null | undefined): string {
  // Legacy v1 labels — still referenced by some stale rows until re-extract.
  const map: Record<string, string> = {
    invoice: "Rechnung",
    reminder: "Mahnung",
    tax: "Steuern",
    authority: "Behörde",
    insurance: "Versicherung",
    contract: "Vertrag",
    hr: "Personal",
    advertisement: "Werbung",
    task: "Aufgabe",
    info: "Info",
    other: "Sonstiges",
  };
  return c ? (map[c] ?? c) : "—";
}

export function documentTypeLabel(t: string | null | undefined): string {
  const map: Record<string, string> = {
    rechnung: "Rechnung",
    mahnung: "Mahnung",
    betreibung: "Betreibung",
    verfuegung: "Verfügung",
    police: "Police",
    vertrag: "Vertrag",
    bestaetigung: "Bestätigung",
    kontoauszug: "Kontoauszug",
    aufforderung: "Aufforderung",
    information: "Information",
    werbung: "Werbung",
    sonstiges: "Sonstiges",
  };
  return t ? (map[t] ?? t) : "—";
}

export function reminderLabel(level: number | null | undefined): string {
  if (level == null || level === 0) return "";
  if (level === 1) return "1. Mahnung";
  if (level === 2) return "2. Mahnung";
  if (level === 3) return "Letzte Mahnung";
  if (level === 4) return "Betreibung";
  return `Mahnstufe ${level}`;
}
