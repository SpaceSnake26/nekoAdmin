"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditCardDialog } from "@/components/kanban/edit-card-dialog";
import type { SearchSelectOption } from "@/components/ui/search-select";
import { deleteKanbanCard } from "@/server/actions/kanban-actions";

interface CardSnapshot {
  id: string;
  title: string;
  notes: string | null;
  columnId: string;
  leadId: string | null;
  eventId: string | null;
  campaignTag: string | null;
  assignee: string | null;
  dueDate: Date | null;
}

export function CardActions({
  card,
  columns,
  leadOptions,
  eventOptions,
}: {
  card: CardSnapshot;
  columns: { id: string; label: string }[];
  leadOptions: SearchSelectOption[];
  eventOptions: SearchSelectOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!confirm(`Karte „${card.title}" löschen?`)) return;
    startTransition(async () => {
      try {
        await deleteKanbanCard(card.id);
        toast.success("Karte gelöscht");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <>
      {/* Block dnd-kit from starting a drag when interacting with the menu. */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="opacity-40 hover:opacity-100 transition-opacity rounded-sm p-0.5 cursor-pointer"
                disabled={pending}
                aria-label="Karten-Aktionen"
              />
            }
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Pencil className="size-3" />
              Bearbeiten
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={remove} className="text-destructive">
              <Trash2 className="size-3" />
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editing ? (
        <EditCardDialog
          open={editing}
          onOpenChange={setEditing}
          card={card}
          columns={columns}
          leadOptions={leadOptions}
          eventOptions={eventOptions}
        />
      ) : null}
    </>
  );
}
