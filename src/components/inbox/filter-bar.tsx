import Link from "next/link";

import { documentTypeLabel } from "@/lib/format";

interface FilterBarProps {
  documentType: string;
  area: string;
  paymentStatus: string;
  activeTags: string[];
  search: string;
  view: string;
  group: string;
  sort: string;
  direction: string;
  typeCounts: { documentType: string | null; count: number }[];
  areaCounts: { area: string | null; count: number }[];
  areaLabelMap: Map<string, string>;
  availableTags: { name: string; count: number }[];
}

export function FilterBar(props: FilterBarProps) {
  const {
    documentType,
    area,
    paymentStatus,
    activeTags,
    search,
    view,
    group,
    sort,
    direction,
    typeCounts,
    areaCounts,
    areaLabelMap,
    availableTags,
  } = props;

  const buildUrl = (overrides: Record<string, string | string[]>) => {
    const params = new URLSearchParams({
      q: search,
      type: documentType,
      area,
      pay: paymentStatus,
      view,
      group,
      sort,
      dir: direction,
    });
    for (const t of activeTags) params.append("tag", t);
    for (const [k, v] of Object.entries(overrides)) {
      if (Array.isArray(v)) {
        params.delete(k);
        for (const item of v) params.append(k, item);
      } else {
        params.set(k, v);
      }
    }
    return `/inbox?${params.toString()}`;
  };
  const buildTagToggle = (tagName: string) => {
    const next = activeTags.includes(tagName)
      ? activeTags.filter((t) => t !== tagName)
      : [...activeTags, tagName];
    return buildUrl({ tag: next });
  };

  const types: { key: string; label: string; count: number }[] = [
    { key: "all", label: "Alle", count: typeCounts.reduce((s, c) => s + c.count, 0) },
    ...typeCounts
      .filter((c) => c.documentType)
      .sort((a, b) => b.count - a.count)
      .map((c) => ({ key: c.documentType!, label: documentTypeLabel(c.documentType), count: c.count })),
  ];
  const areas: { key: string; label: string; count: number }[] = [
    { key: "all", label: "Alle", count: areaCounts.reduce((s, c) => s + c.count, 0) },
    ...areaCounts
      .filter((c) => c.area)
      .sort((a, b) => b.count - a.count)
      .map((c) => ({ key: c.area!, label: areaLabelMap.get(c.area!) ?? c.area!, count: c.count })),
    ...areaCounts
      .filter((c) => !c.area)
      .map((c) => ({ key: "none", label: "—", count: c.count })),
  ];
  const payments = [
    { key: "all", label: "Alle" },
    { key: "open", label: "Offen" },
    { key: "paid", label: "Bezahlt" },
    { key: "none", label: "—" },
  ];

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3 items-start text-[12px]">
      <FilterGroup
        label="Typ"
        items={types.map((c) => ({
          key: c.key,
          label: c.label,
          count: c.count,
          href: buildUrl({ type: c.key }),
          active: documentType === c.key,
        }))}
      />
      <FilterGroup
        label="Bereich"
        items={areas.map((c) => ({
          key: c.key,
          label: c.label,
          count: c.count,
          href: buildUrl({ area: c.key }),
          active: area === c.key,
        }))}
      />
      <FilterGroup
        label="Zahlung"
        items={payments.map((p) => ({
          key: p.key,
          label: p.label,
          href: buildUrl({ pay: p.key }),
          active: paymentStatus === p.key,
        }))}
      />
      {availableTags.length > 0 ? (
        <div className="flex items-start gap-2.5 basis-full">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium pt-1">
            Tags
          </span>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((t) => (
              <Link
                key={t.name}
                href={buildTagToggle(t.name)}
                className={`text-[11px] px-2 py-0.5 rounded-sm transition-colors ${
                  activeTags.includes(t.name)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t.name}
                <span className="ml-1 font-mono text-[10px] opacity-70 tabular-nums">
                  {t.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterGroup({
  label,
  items,
}: {
  label: string;
  items: { key: string; label: string; count?: number; href: string; active: boolean }[];
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium">
        {label}
      </span>
      <div className="flex items-center flex-wrap">
        {items.map((i, idx) => (
          <Link
            key={i.key}
            href={i.href}
            className={`px-2.5 py-1 text-xs transition-colors ${
              i.active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            } ${idx > 0 ? "border-l border-border" : ""}`}
          >
            {i.label}
            {typeof i.count === "number" ? (
              <span className="ml-1.5 font-mono text-[10px] text-muted-foreground/70 tabular-nums">
                {i.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
