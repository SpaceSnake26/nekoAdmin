import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { thumbnailPath } from "@/server/pipeline/thumbnail";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const p = thumbnailPath(id);
  try {
    const s = await stat(p);
    const stream = createReadStream(p);
    return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(s.size),
        // Thumbnails never change once generated; cache aggressively.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
