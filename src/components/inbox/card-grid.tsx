import type { Bucket } from "@/server/queries/letters";

import { GroupCard } from "./group-card";
import { LetterCard, type LetterCardData } from "./letter-card";

export function CardGridFlat({
  letters,
  groupCounts,
  areaLabel,
  now,
}: {
  letters: LetterCardData[];
  groupCounts: Map<string, number>;
  areaLabel: Map<string, string>;
  now: Date;
}) {
  if (letters.length === 0) {
    return <EmptyCards />;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {letters.map((l, i) => (
        <div
          key={l.id}
          className="stagger-child"
          style={{ ["--index" as never]: Math.min(i, 25) } as React.CSSProperties}
        >
          <LetterCard
            letter={{
              ...l,
              groupLetterCount: l.groupId ? groupCounts.get(l.groupId) : undefined,
            }}
            now={now}
            areaLabel={areaLabel}
          />
        </div>
      ))}
    </div>
  );
}

export function CardGridGrouped({
  buckets,
  areaLabel,
  now,
}: {
  buckets: Bucket[];
  areaLabel: Map<string, string>;
  now: Date;
}) {
  if (buckets.length === 0) {
    return <EmptyCards />;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {buckets.map((b, i) => (
        <div
          key={b.realGroupId ?? `solo:${b.hero.id}`}
          className="stagger-child"
          style={{ ["--index" as never]: Math.min(i, 25) } as React.CSSProperties}
        >
          <GroupCard
            bucket={{
              hero: b.hero as unknown as LetterCardData,
              siblings: b.siblings as unknown as LetterCardData[],
              realGroupId: b.realGroupId,
              groupTitle: b.groupTitle,
              groupStatus: b.groupStatus,
            }}
            now={now}
            areaLabel={areaLabel}
          />
        </div>
      ))}
    </div>
  );
}

function EmptyCards() {
  return (
    <div className="border border-dashed border-border rounded-md py-16 text-center text-sm text-muted-foreground">
      Keine Briefe gefunden.
    </div>
  );
}
