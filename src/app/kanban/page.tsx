import { asc, gte } from "drizzle-orm";

import { formatDate } from "@/lib/format";
import { db, schema } from "@/server/db";
import { getKanbanBoard } from "@/server/queries/kanban";
import { AddCardDialog } from "@/components/kanban/add-card-dialog";
import { KanbanBoardClient } from "@/components/kanban/board";
import type { SearchSelectOption } from "@/components/ui/search-select";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const [board, leads, events] = await Promise.all([
    getKanbanBoard(),
    db
      .select({
        id: schema.leads.id,
        pharmacyName: schema.leads.pharmacyName,
        city: schema.leads.city,
        email: schema.leads.email,
      })
      .from(schema.leads)
      .orderBy(asc(schema.leads.pharmacyName))
      .limit(1000),
    db
      .select({
        id: schema.itEvents.id,
        title: schema.itEvents.title,
        startsAt: schema.itEvents.startsAt,
        locationCode: schema.itEvents.locationCode,
      })
      .from(schema.itEvents)
      .where(gte(schema.itEvents.startsAt, new Date()))
      .orderBy(asc(schema.itEvents.startsAt))
      .limit(200),
  ]);

  const leadOptions: SearchSelectOption[] = leads.map((l) => ({
    id: l.id,
    label: l.pharmacyName,
    sublabel: [l.city, l.email].filter(Boolean).join(" · "),
  }));
  const eventOptions: SearchSelectOption[] = events.map((e) => ({
    id: e.id,
    label: e.title,
    sublabel: `${formatDate(e.startsAt)} · ${e.locationCode}`,
  }));
  const columnOptions = board.columns.map((c) => ({ id: c.id, label: c.label }));
  const totalCards = board.columns.reduce((s, c) => s + c.cards.length, 0);

  return (
    <div className="px-8 py-10 max-w-[1600px] mx-auto">
      <section className="flex items-end justify-between gap-8 mb-8 border-b border-border pb-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Beschaffung · Kanban
          </div>
          <h1 className="text-3xl font-medium tracking-tight">
            Vertriebs-Pipeline
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {totalCards} Karte{totalCards === 1 ? "" : "n"} · {board.columns.length}{" "}
            Spalten · Karten per Drag-and-Drop verschieben, oben = dringend
          </p>
        </div>
        <AddCardDialog
          columns={columnOptions}
          leadOptions={leadOptions}
          eventOptions={eventOptions}
        />
      </section>

      {board.columns.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Noch keine Spalten konfiguriert.
        </div>
      ) : (
        <KanbanBoardClient
          initial={board}
          leadOptions={leadOptions}
          eventOptions={eventOptions}
        />
      )}
    </div>
  );
}
