import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { db, schema } from "@/server/db";
import { formatAmount } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const groups = await db
    .select({
      id: schema.letterGroups.id,
      title: schema.letterGroups.title,
      status: schema.letterGroups.status,
      amount: schema.letterGroups.amount,
      currency: schema.letterGroups.currency,
      senderId: schema.letterGroups.senderId,
      canonicalName: schema.senders.canonicalName,
    })
    .from(schema.letterGroups)
    .leftJoin(schema.senders, eq(schema.senders.id, schema.letterGroups.senderId))
    .orderBy(desc(schema.letterGroups.createdAt));

  // Count letters per group
  const counts = await db
    .select({
      groupId: schema.letters.groupId,
      count: schema.letters.id,
    })
    .from(schema.letters);
  const byGroup = new Map<string, number>();
  for (const c of counts) {
    if (!c.groupId) continue;
    byGroup.set(c.groupId, (byGroup.get(c.groupId) ?? 0) + 1);
  }

  return (
    <div className="px-6 py-6 max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Gruppen</h1>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Gruppen.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {groups.map((g) => {
            const n = byGroup.get(g.id) ?? 0;
            return (
              <li
                key={g.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/groups/${g.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {g.title}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1">
                    {g.canonicalName ?? "—"} · {n} Brief{n === 1 ? "" : "e"}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {g.amount != null ? (
                    <span className="text-sm font-mono tabular-nums">
                      {formatAmount(g.amount, g.currency ?? "CHF")}
                    </span>
                  ) : null}
                  <Badge
                    variant={g.status === "resolved" ? "secondary" : "outline"}
                  >
                    {g.status === "resolved" ? "bezahlt" : "offen"}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
