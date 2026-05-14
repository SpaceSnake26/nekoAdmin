import { desc, eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import { formatRelative } from "@/lib/format";
import { ThemeIconToggle } from "@/components/theme-toggle";

import { SyncButton } from "./sync-button";

async function getTopbarMeta() {
  const [lastSync] = await db
    .select({
      startedAt: schema.syncRuns.startedAt,
      status: schema.syncRuns.status,
      newLetters: schema.syncRuns.newLetters,
    })
    .from(schema.syncRuns)
    .where(eq(schema.syncRuns.status, "success"))
    .orderBy(desc(schema.syncRuns.startedAt))
    .limit(1);
  return { lastSync };
}

export async function Topbar() {
  const { lastSync } = await getTopbarMeta();

  return (
    <header className="h-14 shrink-0 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6">
      <div className="flex items-center gap-3 min-w-0">
        {lastSync ? (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
              <span className="relative rounded-full bg-primary size-1.5" />
            </span>
            <span>
              Letzter Sync{" "}
              <span className="text-foreground/90">
                {formatRelative(lastSync.startedAt)}
              </span>
              {lastSync.newLetters > 0 ? ` · ${lastSync.newLetters} neu` : ""}
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground">
            Noch nicht synchronisiert
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <ThemeIconToggle />
        <SyncButton />
      </div>
    </header>
  );
}
