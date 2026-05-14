import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, schema } from "@/server/db";
import { formatAmount, formatDate, reminderLabel, shortId } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [group] = await db
    .select()
    .from(schema.letterGroups)
    .where(eq(schema.letterGroups.id, id))
    .limit(1);
  if (!group) notFound();

  const sender = group.senderId
    ? (
        await db
          .select()
          .from(schema.senders)
          .where(eq(schema.senders.id, group.senderId))
          .limit(1)
      )[0]
    : null;

  const letters = await db
    .select()
    .from(schema.letters)
    .where(eq(schema.letters.groupId, id))
    .orderBy(asc(schema.letters.receivedAt));

  return (
    <div className="px-6 py-6 max-w-4xl space-y-5">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs text-muted-foreground">
            G_{shortId(group.id)}
          </span>
          <Badge variant={group.status === "resolved" ? "secondary" : "outline"}>
            {group.status === "resolved" ? "bezahlt" : "offen"}
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{group.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {sender?.canonicalName ?? "—"} · {letters.length} Brief
          {letters.length === 1 ? "" : "e"}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zeitlinie</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {letters.map((l) => (
              <li
                key={l.id}
                className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0"
              >
                <div className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums pt-0.5">
                  {formatDate(l.letterDate ?? l.receivedAt)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/letters/${l.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {l.subject ?? "(ohne Titel)"}
                    </Link>
                    {reminderLabel(l.reminderLevel) ? (
                      <Badge variant="outline" className="text-[10px]">
                        {reminderLabel(l.reminderLevel)}
                      </Badge>
                    ) : null}
                    {l.paymentStatus === "paid" ? (
                      <Badge className="text-[10px] bg-emerald-600">
                        bezahlt
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono mr-2">L_{shortId(l.id)}</span>
                    {l.amount != null ? formatAmount(l.amount, l.currency ?? "CHF") : null}
                    {l.dueDate ? ` · fällig ${formatDate(l.dueDate)}` : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
