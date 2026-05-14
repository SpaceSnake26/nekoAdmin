"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { startGlobalSwissScan } from "@/server/actions/leads-actions";
import type { ScanSource } from "@/lib/scanner";

export function ScanButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(source: ScanSource) {
    setOpen(false);
    const label =
      source === "both"
        ? "GMaps + local.ch"
        : source === "gmaps"
          ? "Google Maps"
          : "local.ch";
    const tid = toast.loading(`Scan läuft (${label})…`);
    startTransition(async () => {
      try {
        const result = await startGlobalSwissScan(source);
        toast.success(
          `${result.inserted} neu · ${result.skipped} bereits vorhanden · ${result.fetched} gesamt`,
          { id: tid },
        );
        if (result.errors.length > 0) {
          for (const err of result.errors.slice(0, 3)) toast.warning(err);
        }
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e), { id: tid });
      }
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<Button disabled={pending} />}>
        <Sparkles className="size-4" />
        {pending ? "Scan läuft…" : "Global Swiss Scan"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run("both")}>
          GMaps + local.ch
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("gmaps")}>
          Nur Google Maps
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("local-ch")}>
          Nur local.ch
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
