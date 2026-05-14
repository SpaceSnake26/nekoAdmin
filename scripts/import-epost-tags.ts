/**
 * One-shot import of ePost UI tags into our local status fields.
 *
 * - "Bezahlt" / "Zahlung erfasst" / "Zahlauftrag erfasst" → paymentStatus=paid + paidAt=now
 * - "done" / "DONE" / "erledigt" → taskStatus=done + doneAt=now
 * - Other tags (TODO/URGENT/etc.) → ignored (TODO is implicitly the open state)
 *
 * Marks paymentStatus / taskStatus as user-edited so re-extraction won't reset them.
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: true });

import { eq } from "drizzle-orm";

import { db, schema } from "../src/server/db";
import { renderMarkdownIndex } from "../src/server/pipeline/markdown-index";

interface Entry {
  epostId: string;
  tags: string[];
}

const TABLE: Entry[] = [
  { epostId: "69babf700a05806f953edf29", tags: ["Bezahlt"] },
  { epostId: "69b16ab23c7019235d60e00f", tags: ["TODO"] },
  { epostId: "699894410648467e3e8446cc", tags: ["TODO"] },
  { epostId: "698c320fa559ce0d1518edf8", tags: ["done"] },
  { epostId: "6982244f19f37113718cc14e", tags: ["TODO"] },
  { epostId: "697936216b7e0a66a563e7c1", tags: ["TODO"] },
  { epostId: "696fa775e5337f0ffbbba3f7", tags: ["TODO"] },
  { epostId: "692f3169ba708110c776d691", tags: ["TODO"] },
  { epostId: "691f3be668ffc27ff6cc84df", tags: ["TODO"] },
  { epostId: "691dcd87a7f7dd033c4d8336", tags: ["TODO", "URGENT"] },
  { epostId: "691c9197d260e45f3b6c8686", tags: ["TODO"] },
  { epostId: "69149b2669f1835b065f3057", tags: ["TODO"] },
  { epostId: "690afd4d1f578e7e9ce5f772", tags: ["Bezahlt", "DONE"] },
  { epostId: "6904cf806bb4134699e04dd1", tags: ["Bezahlt", "DONE"] },
  { epostId: "6904c87636ac2268bdfe4a48", tags: ["DONE"] },
  { epostId: "68f64eaa1d6c1e012e3b061e", tags: ["Bezahlt", "DONE"] },
  { epostId: "68e65274243b072b9772dded", tags: ["Bezahlt", "DONE"] },
  { epostId: "68e37a2fed814b63b0172a1f", tags: ["Bezahlt", "DONE"] },
  { epostId: "68d285809bd85a4f57dcd4a5", tags: ["DONE"] },
  { epostId: "68d1737234d29c4a8f5c90ea", tags: ["DONE"] },
  { epostId: "68bb0254f892081d2b1a655a", tags: ["DONE", "Bezahlt"] },
  { epostId: "68b83cf56d28566ebe786750", tags: ["Bezahlt", "DONE"] },
  { epostId: "68b5bd1b3cd6f57451dc8f02", tags: ["DONE"] },
  { epostId: "68af2c74c5b0f6346bb22bb9", tags: ["Bezahlt"] },
  { epostId: "6892f01388893d3169440287", tags: ["todo"] },
  { epostId: "67fd38641af2b96ecc1fe040", tags: ["TODO"] },
  { epostId: "67e5925994ff22002bedaef0", tags: ["Bezahlt", "DONE"] },
  { epostId: "67e18fb41adf8d0d8f3738e0", tags: ["TODO"] },
  { epostId: "67d96e7ddabc5f6544ba30c8", tags: ["DONE"] },
  { epostId: "67d17e8cbd40a43c1baac09f", tags: ["TODO"] },
  { epostId: "67cef7c3a7324d600e30d68c", tags: ["DONE"] },
  { epostId: "67c9b19a490cfb2b2c3c7da5", tags: ["TODO"] },
  { epostId: "67c723d2ef5b0673495ee0ca", tags: ["Bezahlt"] },
  { epostId: "67ace8efbee78163dbc19702", tags: ["DONE"] },
  { epostId: "67a1eebf28f5ae583f660131", tags: ["Bezahlt"] },
  { epostId: "679ae44baf33d30e3b0e829c", tags: ["TODO"] },
  { epostId: "679283c5fe73ea3c92fa60e5", tags: ["DONE"] },
  { epostId: "679155941fc6363c08f1db1e", tags: ["TODO"] },
  { epostId: "678e41f5b6fcd21701cc3cae", tags: ["TODO"] },
  { epostId: "6787b1a3b44e17606aa19654", tags: ["TODO"] },
  { epostId: "67817563b6181a5c0b30ff75", tags: ["Bezahlt"] },
  { epostId: "67816e58328cf74354662b61", tags: ["done"] },
  { epostId: "677c30bdef1cbf18fb9cd4b4", tags: ["Bezahlt"] },
  { epostId: "677317f8ef150e0cba9f1535", tags: ["done"] },
  { epostId: "6761ca49b755774a912537f1", tags: ["TODO"] },
  { epostId: "6761760553630a7e46d6edf8", tags: ["TODO"] },
  { epostId: "6751ff68fd5bf12c220f0bc0", tags: ["TODO"] },
  { epostId: "674f32242a20ef63d977b553", tags: ["TODO"] },
  { epostId: "674f2849a238d4406442a854", tags: ["Bezahlt"] },
  { epostId: "674e745481c9c63b6e21b1c7", tags: ["done"] },
  { epostId: "674e434123af311ca3529893", tags: ["TODO"] },
  { epostId: "674e433c23af311ca3529862", tags: ["TODO"] },
  { epostId: "674628fbb167223869bc6e92", tags: ["DONE"] },
  { epostId: "6740e30d62d8230dc7319d14", tags: ["Zahlung erfasst"] },
  { epostId: "672d155176b95e2476168328", tags: ["Bezahlt"] },
  { epostId: "672b24e994c57d3866b161de", tags: ["Bezahlt"] },
  { epostId: "6720f890ee01fd0308008d14", tags: ["done"] },
  { epostId: "670ebc1a6481f00b4661047a", tags: ["TODO"] },
  { epostId: "66feb1846c9819230415ea70", tags: ["DONE"] },
  { epostId: "66eb155318a6ee1619d4feb7", tags: ["DONE"] },
  { epostId: "66e45a9271d63c184aafb10e", tags: ["DONE"] },
  { epostId: "66db4a3dceb33179f20307c2", tags: ["Werbung"] },
  { epostId: "66d9d5ca0173311ee7a3428a", tags: ["Bezahlt", "DONE"] },
  { epostId: "66d6b9ed0cb3e02b5d894b69", tags: ["Bezahlt"] },
  { epostId: "66c61d442add080cfdd91fb1", tags: ["done"] },
  { epostId: "66b4a574ad3cad7c3c9153db", tags: ["TODO"] },
  { epostId: "66b1b6306107842b548693ab", tags: ["Bezahlt"] },
  { epostId: "66aa124bbfe8ea776280894c", tags: ["TODO"] },
  { epostId: "66a8d60b9812ff26f34c530e", tags: ["TODO", "URGENT"] },
  { epostId: "669e891943033a5abfad517f", tags: ["done"] },
  { epostId: "66992002e966593c916145c2", tags: ["TODO", "URGENT"] },
  { epostId: "669918fe58f82c55d9eb2590", tags: ["done"] },
  { epostId: "66969915c2369f496cf54072", tags: ["done"] },
  { epostId: "6695408cc44aa53366fb9525", tags: ["TODO"] },
  { epostId: "668ea21b9b7aaf5030c3fd25", tags: ["Bezahlt"] },
  { epostId: "668bff07089c3d5b19f67606", tags: ["done"] },
  { epostId: "6686ce1c7a7c4b63dc9b04bd", tags: ["done"] },
  { epostId: "6686b906b60c8e0343d49216", tags: ["done"] },
  { epostId: "6686aaf67a7c4b63dc9ae233", tags: ["done", "Bezahlt"] },
  { epostId: "668570b64414ae2d0ac7566b", tags: ["Bezahlt"] },
  { epostId: "66854b834414ae2d0ac71ebf", tags: ["Zahlauftrag erfasst"] },
  { epostId: "6684403eb497582a1d5ca1d4", tags: ["TODO"] },
  { epostId: "6673cdc3f8968e506c845aca", tags: ["Bezahlt"] },
  { epostId: "666994f768afc016c971fab6", tags: ["Bezahlt"] },
  { epostId: "66682e46a7224a1708f34a2f", tags: ["TODO"] },
  { epostId: "66632ea2a4baed5ce6be66e6", tags: ["Bezahlt"] },
  { epostId: "6661abe2c83a7408319be716", tags: ["done"] },
  { epostId: "666084b0c05f3b5db77939ed", tags: ["done"] },
  { epostId: "66604f0fc05f3b5db7790367", tags: ["Bezahlt"] },
  { epostId: "66577461abcf8770e01d7983", tags: ["TODO"] },
  { epostId: "66572e1a2db2cd0755abf90d", tags: ["done"] },
  { epostId: "664f9257e785995f5f6c0980", tags: ["Bezahlt"] },
  { epostId: "664cb8258fb9a12bbb4d0078", tags: ["TODO"] },
  { epostId: "6644b913a16f420066e275aa", tags: ["Betreibungsregisterauszug"] },
  { epostId: "664398a7fc83b80f7aaaad60", tags: ["AKSO"] },
  { epostId: "663b85cd31d8ab4f5fe91d20", tags: ["Bezahlt"] },
  { epostId: "6633e2de042978716f5c70ee", tags: ["Bezahlt"] },
  { epostId: "66313fe52a8a3e2b801cdbbb", tags: ["Bezahlt"] },
];

const PAID_TAGS = new Set(["bezahlt", "zahlung erfasst", "zahlauftrag erfasst"]);
const DONE_TAGS = new Set(["done", "erledigt"]);

function classify(tags: string[]): { paid: boolean; done: boolean; ignored: string[] } {
  let paid = false;
  let done = false;
  const ignored: string[] = [];
  for (const raw of tags) {
    const t = raw.toLowerCase().trim();
    if (PAID_TAGS.has(t)) paid = true;
    else if (DONE_TAGS.has(t)) done = true;
    else ignored.push(raw);
  }
  return { paid, done, ignored };
}

async function main() {
  const now = new Date();
  let updatedPaid = 0;
  let updatedDone = 0;
  let notFound = 0;
  const ignoredTagCounts = new Map<string, number>();

  for (const entry of TABLE) {
    const [letter] = await db
      .select({
        id: schema.letters.id,
        userEditedFields: schema.letters.userEditedFields,
        paymentStatus: schema.letters.paymentStatus,
        taskStatus: schema.letters.taskStatus,
      })
      .from(schema.letters)
      .where(eq(schema.letters.epostId, entry.epostId))
      .limit(1);
    if (!letter) {
      notFound++;
      console.log(`  ✗ ${entry.epostId.slice(0, 12)} — nicht in DB (vor 2025-10-01?)`);
      continue;
    }

    const { paid, done, ignored } = classify(entry.tags);
    for (const t of ignored) {
      ignoredTagCounts.set(t, (ignoredTagCounts.get(t) ?? 0) + 1);
    }
    if (!paid && !done) continue; // nothing to update

    const protectedSet = new Set(letter.userEditedFields ?? []);
    const update: Partial<typeof schema.letters.$inferInsert> = {};

    if (paid) {
      update.paymentStatus = "paid";
      update.paidAt = now;
      protectedSet.add("paymentStatus");
      updatedPaid++;
    }
    if (done) {
      update.taskStatus = "done";
      update.doneAt = now;
      protectedSet.add("taskStatus");
      updatedDone++;
    }
    update.userEditedFields = [...protectedSet];

    await db
      .update(schema.letters)
      .set(update)
      .where(eq(schema.letters.id, letter.id));
  }

  // Group cascade — for any paid letter in a group, mark group resolved if all paid
  const groups = await db
    .selectDistinct({ groupId: schema.letters.groupId })
    .from(schema.letters)
    .where(eq(schema.letters.paymentStatus, "paid"));
  for (const g of groups) {
    if (!g.groupId) continue;
    const siblings = await db
      .select({ paymentStatus: schema.letters.paymentStatus })
      .from(schema.letters)
      .where(eq(schema.letters.groupId, g.groupId));
    const anyOpen = siblings.some((s) => s.paymentStatus === "open");
    if (!anyOpen) {
      await db
        .update(schema.letterGroups)
        .set({ status: "resolved", resolvedAt: now })
        .where(eq(schema.letterGroups.id, g.groupId));
    }
  }

  console.log(`\n✓ ${updatedPaid} Briefe als bezahlt markiert`);
  console.log(`✓ ${updatedDone} Briefe als erledigt markiert`);
  console.log(`  ${notFound} ePost-IDs nicht in DB gefunden`);
  if (ignoredTagCounts.size > 0) {
    console.log(`\nIgnorierte Tags (keine Status-Änderung):`);
    for (const [tag, count] of [...ignoredTagCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}× "${tag}"`);
    }
  }

  console.log(`\nRendere briefe.md neu…`);
  const md = await renderMarkdownIndex();
  console.log(`✓ ${md.path} (${md.bytes} bytes, ${md.letterCount} Briefe)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
