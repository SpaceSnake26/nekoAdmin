import Link from "next/link";
import { asc, eq } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { db, schema } from "@/server/db";
import { formatDate, formatRelative, shortId } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await db
    .select({
      id: schema.letters.id,
      subject: schema.letters.subject,
      dueDate: schema.letters.dueDate,
      taskStatus: schema.letters.taskStatus,
      documentType: schema.letters.documentType,
      area: schema.letters.area,
      senderRawName: schema.letters.senderRawName,
      canonicalName: schema.senders.canonicalName,
      receivedAt: schema.letters.receivedAt,
      recommendedAction: schema.letters.recommendedAction,
    })
    .from(schema.letters)
    .leftJoin(schema.senders, eq(schema.senders.id, schema.letters.senderId))
    .where(eq(schema.letters.taskStatus, "open"))
    .orderBy(asc(schema.letters.dueDate));

  return (
    <div className="px-6 py-6 max-w-5xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Aufgaben</h1>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine offenen Aufgaben.</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {tasks.map((t) => (
            <li key={t.id} className="p-4 hover:bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/letters/${t.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {t.subject}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="font-mono">L_{shortId(t.id)}</span>
                    {" · "}
                    {t.canonicalName ?? t.senderRawName ?? "—"}
                    {" · "}
                    Eingang {formatRelative(t.receivedAt)}
                  </div>
                  {t.recommendedAction ? (
                    <p className="text-xs mt-2">{t.recommendedAction}</p>
                  ) : null}
                </div>
                <div className="text-right shrink-0">
                  {t.dueDate ? (
                    <Badge variant="outline">bis {formatDate(t.dueDate)}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">keine Frist</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
