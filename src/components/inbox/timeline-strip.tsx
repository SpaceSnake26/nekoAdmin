import Link from "next/link";

interface Point {
  letterId: string;
  date: Date;
  documentType: string | null;
  reminderLevel: number | null;
}

const TYPE_COLOR: Record<string, string> = {
  rechnung: "bg-emerald-500",
  mahnung: "bg-amber-500",
  betreibung: "bg-rose-500",
  verfuegung: "bg-violet-500",
  police: "bg-teal-500",
  vertrag: "bg-stone-500",
  bestaetigung: "bg-slate-500",
  kontoauszug: "bg-sky-500",
  aufforderung: "bg-blue-500",
  information: "bg-zinc-500",
  werbung: "bg-pink-500",
  sonstiges: "bg-gray-500",
};

const TYPE_SHORT: Record<string, string> = {
  rechnung: "Rg",
  mahnung: "Mn",
  betreibung: "Betr",
  verfuegung: "Verf",
  police: "Po",
  vertrag: "Vt",
  bestaetigung: "Bs",
  kontoauszug: "Ka",
  aufforderung: "Auf",
  information: "Info",
  werbung: "Wb",
  sonstiges: "?",
};

const MONTH_SHORT = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

function shortType(p: Point): string {
  if (p.reminderLevel === 1) return "1.Mn";
  if (p.reminderLevel === 2) return "2.Mn";
  if (p.reminderLevel === 3) return "Letzte";
  if (p.reminderLevel === 4) return "Betr";
  return TYPE_SHORT[p.documentType ?? "sonstiges"] ?? "?";
}

/**
 * Horizontal timeline strip showing all letters in a group.
 * Oldest left, newest right. Each dot is a link to the letter — placed in
 * a `pointer-events-auto` wrapper so it captures clicks before the parent
 * card's overlay link.
 */
export function TimelineStrip({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const minTs = sorted[0].date.getTime();
  const maxTs = sorted[sorted.length - 1].date.getTime();
  const span = Math.max(maxTs - minTs, 1);

  const positions = sorted.map((p) => ((p.date.getTime() - minTs) / span) * 100);
  const MIN_GAP = 8;
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] - positions[i - 1] < MIN_GAP) {
      positions[i] = positions[i - 1] + MIN_GAP;
    }
  }
  const rightmost = positions[positions.length - 1];
  if (rightmost > 100) {
    const scale = 100 / rightmost;
    for (let i = 0; i < positions.length; i++) positions[i] *= scale;
  }

  return (
    <div className="relative w-full pt-1 pb-2 pointer-events-none">
      <div className="absolute left-0 right-0 top-[11px] h-px bg-border" />
      <ol className="relative flex items-start min-h-[3rem]">
        {sorted.map((p, i) => {
          const color = TYPE_COLOR[p.documentType ?? "sonstiges"] ?? "bg-gray-500";
          const shortLabel = shortType(p);
          const isNewest = i === sorted.length - 1;
          return (
            <li
              key={p.letterId}
              className="absolute -translate-x-1/2 pointer-events-auto"
              style={{ left: `${positions[i]}%` }}
            >
              <Link
                href={`/letters/${p.letterId}`}
                className="group/dot flex flex-col items-center gap-1"
                title={`${p.date.toLocaleDateString("de-CH")} · ${shortLabel}`}
              >
                <span
                  className={`size-2.5 rounded-full ring-2 ring-card transition-transform group-hover/dot:scale-125 ${color} ${
                    isNewest ? "ring-4 ring-card shadow-[0_0_0_1.5px] shadow-primary/40" : ""
                  }`}
                />
                <div className="flex flex-col items-center leading-none text-[9px] text-muted-foreground">
                  <span className="font-mono tabular-nums">
                    {MONTH_SHORT[p.date.getMonth()]}
                  </span>
                  <span className="mt-0.5 font-medium text-foreground/70">
                    {shortLabel}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
