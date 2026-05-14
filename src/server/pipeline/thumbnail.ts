import { execFile as execFileCb } from "node:child_process";
import { access, mkdir, readFile, rename } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

const THUMBNAILS_DIR = path.resolve(process.cwd(), "data", "thumbnails");
const PDFTOPPM = "/opt/homebrew/bin/pdftoppm";

export function thumbnailPath(letterId: string): string {
  return path.join(THUMBNAILS_DIR, `${letterId}.jpg`);
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a JPEG thumbnail of the first page of a PDF.
 * Idempotent — skips if the target file already exists.
 *
 * pdftoppm writes to `<prefix>-1.jpg` when rendering page 1, so we emit to a
 * temp prefix and rename to the canonical filename afterwards.
 */
export async function generateThumbnail(
  pdfPath: string,
  letterId: string,
): Promise<{ thumbnailPath: string; bytes: number; skipped: boolean }> {
  await mkdir(THUMBNAILS_DIR, { recursive: true });
  const finalPath = thumbnailPath(letterId);
  if (await exists(finalPath)) {
    const bytes = (await readFile(finalPath)).byteLength;
    return { thumbnailPath: finalPath, bytes, skipped: true };
  }

  const tmpPrefix = path.join(THUMBNAILS_DIR, `.tmp-${letterId}`);
  await execFile(PDFTOPPM, [
    "-jpeg",
    "-jpegopt",
    "quality=75",
    "-r",
    "60",
    "-f",
    "1",
    "-l",
    "1",
    pdfPath,
    tmpPrefix,
  ]);

  // pdftoppm output suffix depends on page count: `-1.jpg`, `-01.jpg`, or `-001.jpg`
  // (zero-padded to match max-page width). Single-page range can also drop the suffix
  // on some Homebrew builds. Try the common variants in order.
  const candidates = [
    `${tmpPrefix}-1.jpg`,
    `${tmpPrefix}-01.jpg`,
    `${tmpPrefix}-001.jpg`,
    `${tmpPrefix}.jpg`,
  ];
  let produced: string | undefined;
  for (const c of candidates) {
    if (await exists(c)) {
      produced = c;
      break;
    }
  }
  if (!produced) {
    throw new Error(`pdftoppm produced no output for ${letterId}`);
  }
  await rename(produced, finalPath);

  const bytes = (await readFile(finalPath)).byteLength;
  return { thumbnailPath: finalPath, bytes, skipped: false };
}
