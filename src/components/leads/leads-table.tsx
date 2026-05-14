"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { LEAD_STATUS_LABELS, LEAD_STATUS_TONE } from "@/lib/lead-format";
import type { Lead, LeadStatus } from "@/server/db/schema";

const DEFAULT_WIDTHS: Record<string, number> = {
  pharmacyName: 280,
  city: 120,
  source: 100,
  createdAt: 110,
  status: 130,
  email: 220,
  phone: 140,
  hasSite: 70,
  hasShop: 70,
  overallScore: 90,
};

const STORAGE_KEY = "leads-table.sizing.v1";

export function LeadsTable({ rows }: { rows: Lead[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [sizing, setSizing] = useState<ColumnSizingState>({});

  // Restore sizing from localStorage on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSizing(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  // Persist sizing whenever it changes.
  useEffect(() => {
    if (Object.keys(sizing).length === 0) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sizing));
    } catch {
      // ignore
    }
  }, [sizing]);

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        id: "pharmacyName",
        accessorKey: "pharmacyName",
        header: "Apotheke",
        size: DEFAULT_WIDTHS.pharmacyName,
        minSize: 140,
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/leads/${row.original.id}`}
              className="font-medium text-foreground hover:text-sky-500 hover:underline truncate block"
            >
              {row.original.pharmacyName}
            </Link>
            {row.original.contactName ? (
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {row.original.contactName}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "city",
        accessorKey: "city",
        header: "Ort",
        size: DEFAULT_WIDTHS.city,
        minSize: 80,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground truncate block">
            {row.original.city ?? "—"}
          </span>
        ),
      },
      {
        id: "source",
        accessorKey: "source",
        header: "Quelle",
        size: DEFAULT_WIDTHS.source,
        minSize: 80,
        cell: ({ row }) =>
          row.original.source ? (
            <Badge
              variant="secondary"
              className="text-[10px] font-mono uppercase"
            >
              {row.original.source}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Erfasst",
        size: DEFAULT_WIDTHS.createdAt,
        minSize: 90,
        sortingFn: "datetime",
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        size: DEFAULT_WIDTHS.status,
        minSize: 110,
        cell: ({ row }) => (
          <StatusBadge status={row.original.status as LeadStatus} />
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        header: "E-Mail",
        size: DEFAULT_WIDTHS.email,
        minSize: 140,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground truncate block">
            {row.original.email ?? <span className="italic">—</span>}
          </span>
        ),
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "Telefon",
        size: DEFAULT_WIDTHS.phone,
        minSize: 100,
        cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums truncate block">
            {row.original.phone ?? "—"}
          </span>
        ),
      },
      {
        id: "hasSite",
        accessorFn: (r) => Boolean(r.websiteUrl),
        header: "Site",
        size: DEFAULT_WIDTHS.hasSite,
        minSize: 60,
        cell: ({ getValue }) => <BoolCell value={Boolean(getValue())} />,
      },
      {
        id: "hasShop",
        accessorFn: (r) => Boolean(r.hasWebshop),
        header: "Shop",
        size: DEFAULT_WIDTHS.hasShop,
        minSize: 60,
        cell: ({ getValue }) => <BoolCell value={Boolean(getValue())} />,
      },
      {
        id: "overallScore",
        accessorKey: "overallScore",
        header: "Score",
        size: DEFAULT_WIDTHS.overallScore,
        minSize: 70,
        sortDescFirst: true,
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-xs font-semibold">
            {row.original.overallScore != null
              ? row.original.overallScore.toFixed(1)
              : "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnSizing: sizing },
    onSortingChange: setSorting,
    onColumnSizingChange: setSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: "onChange",
    enableColumnResizing: true,
  });

  return (
    <div className="border border-border rounded-md overflow-hidden bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table
          className="border-collapse"
          style={{
            width: table.getTotalSize(),
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            {table.getVisibleLeafColumns().map((col) => (
              <col key={col.id} style={{ width: col.getSize() }} />
            ))}
          </colgroup>
          <thead className="bg-muted/70 border-b-2 border-border">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      className="relative px-3 h-10 text-left text-[10px] uppercase tracking-[0.12em] font-semibold text-foreground/85 select-none border-r border-border last:border-r-0 align-middle"
                    >
                      <button
                        type="button"
                        disabled={!canSort}
                        onClick={h.column.getToggleSortingHandler()}
                        className={`inline-flex items-center gap-1.5 truncate ${
                          canSort
                            ? "cursor-pointer hover:text-foreground"
                            : "cursor-default"
                        }`}
                      >
                        {flexRender(
                          h.column.columnDef.header,
                          h.getContext(),
                        )}
                        {canSort ? (
                          sorted === "asc" ? (
                            <ArrowUp className="size-3 text-sky-500" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3 text-sky-500" />
                          ) : (
                            <ArrowUpDown className="size-3 text-muted-foreground/60" />
                          )
                        ) : null}
                      </button>
                      {h.column.getCanResize() ? (
                        <div
                          onMouseDown={h.getResizeHandler()}
                          onTouchStart={h.getResizeHandler()}
                          onDoubleClick={() => h.column.resetSize()}
                          title="Ziehen zum Anpassen · Doppelklick zum Zurücksetzen"
                          className={`absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none z-10 group ${
                            h.column.getIsResizing() ? "bg-sky-500/60" : ""
                          }`}
                        >
                          <span
                            className={`block mx-auto h-full w-px transition-colors ${
                              h.column.getIsResizing()
                                ? "bg-sky-500"
                                : "bg-border group-hover:bg-sky-500/70"
                            }`}
                          />
                        </div>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, idx) => (
              <tr
                key={row.id}
                className={`border-b border-border transition-colors hover:bg-sky-500/[0.06] ${
                  idx % 2 === 1 ? "bg-muted/30" : ""
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-3 py-2 align-middle overflow-hidden border-r border-border/70 last:border-r-0"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-1.5 border-t border-border bg-muted/40 text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex items-center justify-between">
        <span>
          Spaltenbreite ziehen am rechten Rand · Doppelklick = zurücksetzen ·
          Sortieren mit Klick auf Header
        </span>
        <span className="tabular-nums">
          {table.getRowModel().rows.length} Zeilen
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const tone = LEAD_STATUS_TONE[status];
  const cls =
    tone === "warn"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40 shadow-[0_0_8px_-2px_rgba(245,158,11,0.4)]"
      : tone === "success"
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_-2px_rgba(16,185,129,0.4)]"
        : tone === "muted"
          ? "bg-muted text-muted-foreground border-border"
          : "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/40 shadow-[0_0_8px_-2px_rgba(14,165,233,0.4)]";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] uppercase tracking-wider font-semibold border ${cls}`}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

function BoolCell({ value }: { value: boolean }) {
  return value ? (
    <Check className="size-4 text-emerald-500 dark:text-emerald-400 inline drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
  ) : (
    <X className="size-4 text-muted-foreground/40 inline" />
  );
}
