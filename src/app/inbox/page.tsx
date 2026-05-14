import { Search } from "lucide-react";
import { asc, eq, sql } from "drizzle-orm";

import { CardGridFlat, CardGridGrouped } from "@/components/inbox/card-grid";
import { FilterBar } from "@/components/inbox/filter-bar";
import { ListFlat, ListGrouped } from "@/components/inbox/list-view";
import { GroupToggle, ViewToggle } from "@/components/inbox/view-toggle";
import { db, schema } from "@/server/db";
import {
  getAreaCounts,
  getDocumentTypeCounts,
  getTagUsage,
  listInbox,
  listInboxGrouped,
  type SortKey,
} from "@/server/queries/letters";

export const dynamic = "force-dynamic";

const VALID_SORTS: SortKey[] = [
  "receivedAt",
  "letterDate",
  "dueDate",
  "amount",
  "sender",
  "subject",
];

type ViewMode = "list" | "cards";
type GroupMode = "flat" | "by-group";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // --- URL params ---
  const search = typeof sp.q === "string" ? sp.q : "";
  const documentType = typeof sp.type === "string" ? sp.type : "all";
  const area = typeof sp.area === "string" ? sp.area : "all";
  const paymentStatus = typeof sp.pay === "string" ? sp.pay : "all";
  const rawTags = sp.tag;
  const tags = Array.isArray(rawTags)
    ? rawTags.filter(Boolean)
    : typeof rawTags === "string" && rawTags.length > 0
      ? [rawTags]
      : [];
  const view: ViewMode = sp.view === "list" ? "list" : "cards";
  const group: GroupMode = sp.group === "flat" ? "flat" : "by-group";
  const sort = (typeof sp.sort === "string" && VALID_SORTS.includes(sp.sort as SortKey)
    ? sp.sort
    : "receivedAt") as SortKey;
  const direction: "asc" | "desc" = sp.dir === "asc" ? "asc" : "desc";

  const filters = { search, documentType, area, paymentStatus, tags, sort, direction };

  // --- Data ---
  const [typeCounts, areaCounts, allAreas, tagUsage, groupCountRows] = await Promise.all([
    getDocumentTypeCounts(),
    getAreaCounts(),
    db
      .select()
      .from(schema.areas)
      .where(eq(schema.areas.isHidden, false))
      .orderBy(asc(schema.areas.sortOrder)),
    getTagUsage(),
    // Per-group letter counts — used for group-indicators on flat views
    db
      .select({
        groupId: schema.letters.groupId,
        count: sql<number>`count(*)`,
      })
      .from(schema.letters)
      .groupBy(schema.letters.groupId),
  ]);
  const areaLabelMap = new Map(allAreas.map((a) => [a.code, a.label]));
  const usedTags = tagUsage.filter((t) => t.count > 0);
  const groupCounts = new Map<string, number>();
  for (const r of groupCountRows) {
    if (r.groupId) groupCounts.set(r.groupId, Number(r.count));
  }

  const letters = group === "flat" ? await listInbox(filters) : [];
  const buckets = group === "by-group" ? await listInboxGrouped(filters) : [];

  const now = new Date();

  const totalCount =
    group === "flat"
      ? letters.length
      : buckets.reduce((s, b) => s + 1 + b.siblings.length, 0);

  // --- URL builders for toggles ---
  const buildToggleUrl = (overrides: Partial<{ view: ViewMode; group: GroupMode }>) => {
    const params = new URLSearchParams({
      q: search,
      type: documentType,
      area,
      pay: paymentStatus,
      view: overrides.view ?? view,
      group: overrides.group ?? group,
      sort,
      dir: direction,
    });
    for (const t of tags) params.append("tag", t);
    return `/inbox?${params.toString()}`;
  };

  const base = {
    search,
    documentType,
    area,
    paymentStatus,
    tags,
    view,
    group,
  };

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 border-b border-border pb-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
            Archiv
          </div>
          <h1 className="text-2xl font-medium tracking-tight">Posteingang</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono tabular-nums">
            {totalCount} {totalCount === 1 ? "Brief" : "Briefe"}
            {group === "by-group" ? ` · ${buckets.length} ${buckets.length === 1 ? "Gruppe" : "Gruppen"}` : ""}
          </p>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <ViewToggle current={view} buildUrl={(v) => buildToggleUrl({ view: v })} />
          <GroupToggle current={group} buildUrl={(g) => buildToggleUrl({ group: g })} />

          <form className="relative w-72">
            <Search
              className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              strokeWidth={1.75}
            />
            <input
              name="q"
              defaultValue={search}
              placeholder="Suche: Absender, Betreff, Referenz…"
              className="w-full h-9 pl-9 pr-3 bg-muted/60 border border-border rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring transition"
            />
            {documentType !== "all" ? <input type="hidden" name="type" value={documentType} /> : null}
            {area !== "all" ? <input type="hidden" name="area" value={area} /> : null}
            {paymentStatus !== "all" ? <input type="hidden" name="pay" value={paymentStatus} /> : null}
            {tags.map((t) => (
              <input key={t} type="hidden" name="tag" value={t} />
            ))}
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="group" value={group} />
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="dir" value={direction} />
          </form>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        documentType={documentType}
        area={area}
        paymentStatus={paymentStatus}
        activeTags={tags}
        search={search}
        view={view}
        group={group}
        sort={sort}
        direction={direction}
        typeCounts={typeCounts}
        areaCounts={areaCounts}
        areaLabelMap={areaLabelMap}
        availableTags={usedTags}
      />

      {/* Active view */}
      {view === "list" && group === "flat" ? (
        <ListFlat
          letters={letters as never}
          groupCounts={groupCounts}
          areaLabel={areaLabelMap}
          sort={sort}
          dir={direction}
          base={base}
          now={now}
        />
      ) : null}
      {view === "list" && group === "by-group" ? (
        <ListGrouped
          buckets={buckets}
          areaLabel={areaLabelMap}
          sort={sort}
          dir={direction}
          base={base}
          now={now}
        />
      ) : null}
      {view === "cards" && group === "flat" ? (
        <CardGridFlat
          letters={letters as never}
          groupCounts={groupCounts}
          areaLabel={areaLabelMap}
          now={now}
        />
      ) : null}
      {view === "cards" && group === "by-group" ? (
        <CardGridGrouped buckets={buckets} areaLabel={areaLabelMap} now={now} />
      ) : null}
    </div>
  );
}
