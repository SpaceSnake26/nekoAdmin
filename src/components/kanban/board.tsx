"use client";

import { memo, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Tag, User } from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/format";
import { reorderColumn } from "@/server/actions/kanban-actions";
import type { SearchSelectOption } from "@/components/ui/search-select";
import { AddCardDialog } from "@/components/kanban/add-card-dialog";
import { CardActions } from "@/components/kanban/card-actions";
import { ColumnIcon } from "@/components/kanban/column-icon";
import type { KanbanBoard } from "@/server/queries/kanban";

const COLOR_DOT: Record<string, string> = {
  danger: "bg-destructive",
  warning: "bg-warning",
  success: "bg-primary",
  muted: "bg-muted-foreground/40",
};

const COLUMN_TINT: Record<string, string> = {
  danger:
    "border-destructive/30 bg-destructive/[0.04] [&_header]:bg-destructive/[0.06]",
  warning:
    "border-warning/30 bg-warning/[0.04] [&_header]:bg-warning/[0.06]",
  success:
    "border-primary/30 bg-primary/[0.04] [&_header]:bg-primary/[0.06]",
  muted: "border-border bg-muted/30 [&_header]:bg-muted/40",
};

type Card = KanbanBoard["columns"][number]["cards"][number];

export function KanbanBoardClient({
  initial,
  leadOptions,
  eventOptions,
}: {
  initial: KanbanBoard;
  leadOptions: SearchSelectOption[];
  eventOptions: SearchSelectOption[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [board, setBoard] = useState<KanbanBoard>(initial);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => setBoard(initial), [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const cardIndex = useMemo(() => {
    const m = new Map<string, { columnId: string; card: Card }>();
    for (const col of board.columns) {
      for (const c of col.cards) m.set(c.id, { columnId: col.id, card: c });
    }
    return m;
  }, [board]);

  const columnOptions = board.columns.map((c) => ({
    id: c.id,
    label: c.label,
  }));

  function findColumnIdFor(itemId: string): string | null {
    if (board.columns.some((c) => c.id === itemId)) return itemId;
    return cardIndex.get(itemId)?.columnId ?? null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeColId = findColumnIdFor(String(active.id));
    const overColId = findColumnIdFor(String(over.id));
    if (!activeColId || !overColId || activeColId === overColId) return;

    setBoard((prev) => {
      const next = structuredClone(prev) as KanbanBoard;
      const fromCol = next.columns.find((c) => c.id === activeColId);
      const toCol = next.columns.find((c) => c.id === overColId);
      if (!fromCol || !toCol) return prev;
      const idx = fromCol.cards.findIndex((c) => c.id === active.id);
      if (idx < 0) return prev;
      const [moved] = fromCol.cards.splice(idx, 1);
      const overIdx = toCol.cards.findIndex((c) => c.id === over.id);
      if (overIdx >= 0) toCol.cards.splice(overIdx, 0, moved);
      else toCol.cards.unshift(moved);
      return next;
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const overColId = findColumnIdFor(String(over.id));
    if (!overColId) return;

    const targetCol = board.columns.find((c) => c.id === overColId);
    if (!targetCol) return;

    const currentIds = targetCol.cards.map((c) => c.id);
    const fromIdx = currentIds.indexOf(String(active.id));
    let toIdx = currentIds.indexOf(String(over.id));
    if (toIdx < 0) toIdx = currentIds.length - 1;
    if (fromIdx < 0) return;

    const reordered = [...currentIds];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    setBoard((prev) => {
      const next = structuredClone(prev) as KanbanBoard;
      const col = next.columns.find((c) => c.id === overColId);
      if (!col) return prev;
      const byId = new Map(col.cards.map((c) => [c.id, c]));
      col.cards = reordered
        .map((id) => byId.get(id))
        .filter((c): c is Card => Boolean(c));
      return next;
    });

    startTransition(async () => {
      try {
        await reorderColumn(overColId, reordered);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
        router.refresh();
      }
    });
  }

  const activeCard = activeId ? cardIndex.get(activeId)?.card : null;

  // Render a static placeholder on first paint, then mount the DndContext
  // on the client. This sidesteps dnd-kit's accessibility-announcer counter
  // (`DndDescribedBy-N`) desyncing between server and client renders.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="grid grid-flow-col auto-cols-[minmax(280px,1fr)] gap-4 overflow-x-auto pb-4">
        {board.columns.map((col) => (
          <div
            key={col.id}
            className="border border-border rounded-md min-h-[360px] bg-muted/30"
          >
            <header className="px-3 py-2.5 border-b border-border/70 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight truncate">
                {col.label}
              </h2>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {col.cards.length}
              </span>
            </header>
            <ul className="p-2 space-y-2">
              {col.cards.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <div className="font-medium text-foreground/95 leading-snug">
                    {c.title}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-flow-col auto-cols-[minmax(280px,1fr)] gap-4 overflow-x-auto pb-4">
        {board.columns.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            color={col.color ?? null}
            cards={col.cards}
            columnOptions={columnOptions}
            leadOptions={leadOptions}
            eventOptions={eventOptions}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? (
          <div className="rounded-md border border-foreground/40 bg-background shadow-xl px-3 py-2.5 text-sm w-[260px] cursor-grabbing rotate-1">
            <div className="font-medium text-foreground/95 leading-snug">
              {activeCard.title}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

const Column = memo(function Column({
  id,
  label,
  color,
  cards,
  columnOptions,
  leadOptions,
  eventOptions,
}: {
  id: string;
  label: string;
  color: string | null;
  cards: Card[];
  columnOptions: { id: string; label: string }[];
  leadOptions: SearchSelectOption[];
  eventOptions: SearchSelectOption[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const tint = (color && COLUMN_TINT[color]) ?? COLUMN_TINT.muted;
  const dot = (color && COLOR_DOT[color]) ?? "bg-foreground/60";

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-md flex flex-col min-h-[360px] transition-colors ${tint} ${
        isOver ? "ring-2 ring-foreground/30" : ""
      }`}
    >
      <header className="px-3 py-2.5 border-b border-border/70 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`size-2 rounded-full shrink-0 ${dot}`} />
          <h2 className="text-sm font-semibold tracking-tight truncate">
            {label}
          </h2>
          <ColumnIcon label={label} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {cards.length}
          </span>
          <AddCardDialog
            columns={columnOptions}
            leadOptions={leadOptions}
            eventOptions={eventOptions}
            defaultColumnId={id}
            trigger={
              <button
                type="button"
                className="size-5 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/60"
                aria-label="Karte hinzufügen"
              >
                +
              </button>
            }
          />
        </div>
      </header>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="p-2 space-y-2 flex-1">
          {cards.length === 0 ? (
            <li className="text-[11px] text-muted-foreground italic px-2 py-6 text-center border border-dashed border-border/60 rounded-md">
              hierher ziehen
            </li>
          ) : (
            cards.map((c) => (
              <SortableCard
                key={c.id}
                card={c}
                columnId={id}
                columnOptions={columnOptions}
                leadOptions={leadOptions}
                eventOptions={eventOptions}
              />
            ))
          )}
        </ul>
      </SortableContext>
    </div>
  );
});

const SortableCard = memo(function SortableCard({
  card,
  columnId,
  columnOptions,
  leadOptions,
  eventOptions,
}: {
  card: Card;
  columnId: string;
  columnOptions: { id: string; label: string }[];
  leadOptions: SearchSelectOption[];
  eventOptions: SearchSelectOption[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const snapshot = {
    id: card.id,
    title: card.title,
    notes: card.notes,
    columnId,
    leadId: card.leadId,
    eventId: card.eventId,
    campaignTag: card.campaignTag,
    assignee: card.assignee,
    dueDate: card.dueDate,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-md border border-border bg-background px-3 py-2.5 text-sm hover:border-foreground/40 hover:shadow-sm transition-all select-none touch-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-foreground/95 leading-snug min-w-0 flex-1">
          {card.title}
        </div>
        <CardActions
          card={snapshot}
          columns={columnOptions}
          leadOptions={leadOptions}
          eventOptions={eventOptions}
        />
      </div>
      {card.notes ? (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 whitespace-pre-wrap">
          {card.notes}
        </p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px]">
        {card.leadId && card.leadPharmacyName ? (
          <Link
            href={`/leads/${card.leadId}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
          >
            {card.leadPharmacyName}
          </Link>
        ) : null}
        {card.eventTitle ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <Calendar className="size-2.5" strokeWidth={2} />
            {card.eventTitle}
          </span>
        ) : null}
        {card.campaignTag ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-violet-500/15 text-violet-600 dark:text-violet-400">
            <Tag className="size-2.5" strokeWidth={2} />
            {card.campaignTag}
          </span>
        ) : null}
        {card.assignee ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
            <User className="size-2.5" strokeWidth={2} />
            {card.assignee}
          </span>
        ) : null}
        {card.dueDate ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono tabular-nums">
            {formatDate(card.dueDate)}
          </span>
        ) : null}
      </div>
    </li>
  );
});
