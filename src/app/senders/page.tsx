import Link from "next/link";
import { desc, sql } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { SenderTagEditor } from "@/components/sender/sender-tag-editor";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db, schema } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function SendersPage() {
  const rows = await db
    .select({
      id: schema.senders.id,
      canonicalName: schema.senders.canonicalName,
      uid: schema.senders.uid,
      aliases: schema.senders.aliases,
      defaultTags: schema.senders.defaultTags,
      letterCount: sql<number>`(select count(*) from letters where letters.sender_id = senders.id)`,
    })
    .from(schema.senders)
    .orderBy(desc(sql`(select count(*) from letters where letters.sender_id = senders.id)`));

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-5">
      <div className="border-b border-border pb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
          Verzeichnis
        </div>
        <h1 className="text-2xl font-medium tracking-tight">Absender</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {rows.length} Absender · auto-Tags werden auf alle neuen Briefe von diesem Sender angewendet
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-32">UID</TableHead>
            <TableHead className="w-20 text-right">Briefe</TableHead>
            <TableHead className="w-64">Aliase</TableHead>
            <TableHead className="w-72">Auto-Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/inbox?type=all&area=all&pay=all&sort=receivedAt&dir=desc`}
                  className="hover:underline text-foreground"
                >
                  {s.canonicalName}
                </Link>
              </TableCell>
              <TableCell className="font-mono text-[11px] text-muted-foreground">
                {s.uid ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums font-mono text-xs">
                {s.letterCount}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {s.aliases.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {s.aliases.slice(0, 2).map((a, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                        {a}
                      </Badge>
                    ))}
                    {s.aliases.length > 2 ? (
                      <span className="text-[10px]">+{s.aliases.length - 2}</span>
                    ) : null}
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <SenderTagEditor
                  senderId={s.id}
                  initialTags={s.defaultTags ?? []}
                  letterCount={s.letterCount}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
