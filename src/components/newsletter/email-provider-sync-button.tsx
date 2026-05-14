"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { syncLeadsToEmailProvider } from "@/server/actions/email-actions";

export function EmailProviderSyncButton({
  disabled,
  providerLabel = "Provider",
}: {
  disabled?: boolean;
  providerLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run() {
    const tid = toast.loading(`Synchronisiere Leads zu ${providerLabel}…`);
    startTransition(async () => {
      try {
        const r = await syncLeadsToEmailProvider();
        toast.success(
          `${r.pushed} synchronisiert · ${r.skipped} übersprungen · ${r.failed} fehlgeschlagen`,
          { id: tid },
        );
        for (const err of r.errors.slice(0, 2)) toast.warning(err);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e), { id: tid });
      }
    });
  }

  return (
    <Button
      variant="outline"
      onClick={run}
      disabled={pending || disabled}
    >
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
      Leads → {providerLabel} synchronisieren
    </Button>
  );
}
