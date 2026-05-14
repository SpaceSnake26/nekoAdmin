"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function ExportCsvLink() {
  const params = useSearchParams();
  const qs = params.toString();
  const href = qs ? `/api/leads/export?${qs}` : "/api/leads/export";
  return (
    <a href={href} className={buttonVariants({ variant: "outline" })}>
      <Download className="size-4" />
      CSV exportieren
    </a>
  );
}
