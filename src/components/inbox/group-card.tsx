import Link from "next/link";
import { Layers } from "lucide-react";

import { LetterCard, type LetterCardData } from "./letter-card";
import { TimelineStrip } from "./timeline-strip";

export interface GroupBucket {
  hero: LetterCardData;
  siblings: LetterCardData[];
  /** Real group id (null for solo buckets — a letter with no groupId). */
  realGroupId: string | null;
  groupTitle?: string;
  groupStatus?: "open" | "resolved";
}

export function GroupCard({
  bucket,
  now,
  areaLabel,
}: {
  bucket: GroupBucket;
  now: Date;
  areaLabel: Map<string, string>;
}) {
  const total = 1 + bucket.siblings.length;

  // Solo bucket or 1-letter group → just render a plain LetterCard
  if (total === 1) {
    return (
      <LetterCard
        letter={{ ...bucket.hero, groupLetterCount: undefined }}
        now={now}
        areaLabel={areaLabel}
      />
    );
  }

  const points = [...bucket.siblings, bucket.hero].map((l) => ({
    letterId: l.id,
    date: l.letterDate ?? l.receivedAt,
    documentType: l.documentType,
    reminderLevel: l.reminderLevel,
  }));

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-ring/60 hover:-translate-y-0.5">
      <LetterCard
        letter={{ ...bucket.hero, groupLetterCount: undefined }}
        now={now}
        areaLabel={areaLabel}
        hideOuterBorder
      />
      <div className="px-3 pb-3 pt-1 border-t border-border/60 bg-muted/10 relative">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
          {bucket.realGroupId ? (
            <Link
              href={`/groups/${bucket.realGroupId}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors relative z-10"
            >
              <Layers className="size-3" strokeWidth={2} />
              Gruppe · {total} Briefe
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Layers className="size-3" strokeWidth={2} />
              {total} Briefe
            </span>
          )}
          {bucket.groupStatus === "resolved" ? (
            <span className="text-primary text-[10px]">abgeschlossen</span>
          ) : null}
        </div>
        <TimelineStrip points={points} />
      </div>
    </div>
  );
}
