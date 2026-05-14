"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PageError({
  routeLabel,
  error,
  reset,
}: {
  routeLabel: string;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(`[${routeLabel}]`, error);
  }, [error, routeLabel]);

  return (
    <div className="px-8 py-16 max-w-[640px] mx-auto text-center">
      <AlertTriangle className="size-8 text-destructive mx-auto mb-4" />
      <h1 className="text-xl font-medium tracking-tight mb-2">
        {routeLabel} konnte nicht geladen werden
      </h1>
      <p className="text-sm text-muted-foreground mb-6 font-mono break-all">
        {error.message}
        {error.digest ? (
          <span className="block mt-2 text-[10px] opacity-60">
            digest: {error.digest}
          </span>
        ) : null}
      </p>
      <Button onClick={reset} variant="outline">
        <RefreshCw className="size-4" />
        Erneut versuchen
      </Button>
    </div>
  );
}
