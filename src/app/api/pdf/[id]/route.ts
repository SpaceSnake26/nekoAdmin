import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [letter] = await db
    .select({
      pdfPath: schema.letters.pdfPath,
      subject: schema.letters.subject,
      epostFileName: schema.letters.epostFileName,
    })
    .from(schema.letters)
    .where(eq(schema.letters.id, id))
    .limit(1);
  if (!letter) {
    return new Response("Not found", { status: 404 });
  }
  const stream = createReadStream(letter.pdfPath);
  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        letter.subject ?? letter.epostFileName ?? id + ".pdf",
      )}"`,
    },
  });
}
