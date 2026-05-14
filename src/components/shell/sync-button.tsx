"use client";

import { RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { triggerSync } from "@/server/actions/sync-action";

export function SyncButton() {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const t = toast.loading("Sync läuft — das kann einige Minuten dauern.");
      try {
        const res = await triggerSync();
        toast.dismiss(t);
        if (res.failed > 0) {
          toast.warning(
            `${res.newLetters} neu, ${res.extracted} extrahiert · ${res.failed} Fehler`,
          );
        } else {
          toast.success(
            `${res.newLetters} neu · ${res.extracted} extrahiert`,
          );
        }
      } catch (err) {
        toast.dismiss(t);
        toast.error(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className="group relative inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-md bg-primary text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-[0.97] disabled:opacity-70 disabled:cursor-wait"
    >
      <RefreshCw
        className={`size-3.5 transition-transform ${isPending ? "animate-spin" : "group-hover:rotate-90 duration-500"}`}
        strokeWidth={2}
      />
      {isPending ? "Synchronisiert…" : "Sync"}
    </button>
  );
}
