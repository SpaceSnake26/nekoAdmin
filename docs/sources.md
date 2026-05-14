# Source: ePost Public Letterbox API

_Verifiziert: 2026-04-21_

## Aktive Source

`EpostApiSource` — direkt gegen die ePost Public Letterbox API.

## Auth

Subscription-Key im Header **`X-API-KEY`** (nicht `Ocp-Apim-Subscription-Key` — das ist der Azure-Default und funktioniert hier NICHT). Bearer Token ist optional in der Doku angegeben, in der Praxis reicht der API-Key allein.

`.env.local`:
```
EPOST_API_KEY=...
EPOST_BASE_URL=https://api.epost.ch
```

## Endpoints

Doku: https://developer.epost.ch/docs/api-docs/ → Bereich "ePost Digital Letterbox" / "ePost eArchive"

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/epost/v2/letters` | Liste der Briefe (paginiert via `limit`/`offset`) |
| GET | `/epost/v2/letters/{id}/content` | Brief-PDF runterladen (octet-stream) |
| GET | `/epost/v2/letters/{id}` | Brief-Metadaten einzeln |
| GET | `/epost/v2/letters/{id}/thumbnail` | Vorschaubild |
| POST | `/epost/v2/letters/{id}/read` | als gelesen markieren |
| PATCH | `/epost/v2/letters/{id}/archive` | archivieren |
| DELETE | `/epost/v2/letters/{id}` | löschen |
| GET | `/epost/v2/letters/deleted` | gelöschte Briefe |
| GET | `/epost/v2/letters/unread` | ungelesene |
| GET | `/epost/v2/letters/search?keyword=...` | Volltext-Suche |
| GET | `/epost/eArchive/folders` | branded folders |
| GET | `/epost/eArchive/letters?folder=...` | Briefe in eArchive-Ordner |

## Wichtige Query-Params auf `GET /epost/v2/letters`

- **`letter-types`** (required, mehrfach erlaubt): `CLASSIC_LETTER`, `SMART_LETTER`, `SMART_LETTER_ANSWER`, `SIMPLE_SHORT_MESSAGE`, `INCAMAIL`, `SECURESEND`
- `from-date`, `to-date`: `yyyy-MM-dd`
- `is-business-tenant`: bool — bei nekosys liefert `true` und `false` aktuell die gleichen 208 Briefe; vermutlich nur ein Tenant aktiv. Kein effektiver Filter.
- `letter-folder`: `INBOX_FOLDER` (default), `SENT_FOLDER`
- `read-status`: `READ`, `UNREAD`, `ALL` (default)
- `with-reminder`: bool
- `senderCaseId`, `senderEndToEndId`, `senderParticipantId`, `senderUserId`: Filter
- `limit` (1–1000, default 48), `offset`

## Response-Schema (List)

```json
{
  "id": "69e1e8c46831ce77cc02840d",
  "letterTitle": "Gescannter Brief",          // bei ScanningService meist generisch
  "fileName": "260417153000174.pdf",
  "senderParticipantId": "0b126786-...",      // ePost-interne IDs
  "senderUserId": "a52bed18-...",
  "senderCaseId": null,
  "senderEndToEndId": "260417153000174",
  "documentTypes": ["Invoice"],                // teils leer, teils "Invoice"/"INVOICE"
  "letterContentReference": "https://api.epost.ch/epost/v2/letters/{id}/content",
  "letterType": "CLASSIC_LETTER",
  "receivedDateTime": "2026-04-17T08:01:07.954Z",
  "documentMessage": null,
  "readStatus": "READ" | "UNREAD",
  "remainingDayToDelete": 30
}
```

## Daten-Charakteristik (Stand 2026-04-21)

- **208 Briefe** seit `from-date=2025-10-01`
- Mehrheit sind **"Gescannter Brief"** (physische Briefe via ScanningService digitalisiert) → kein nützlicher `letterTitle`, **OCR ist Pflicht** für jeden Brief
- Nur wenige haben sprechende Filenames (z.B. `Rechnung Nr._602645.pdf`)
- `documentTypes` ist nur grobe Vorklassifikation (oft leer oder "Invoice"/"INVOICE") — Klassifikation muss aus PDF-Inhalt kommen
- Sender-Identität (`senderParticipantId`) ist nur eine UUID, kein Klartext-Name → Sender muss aus PDF extrahiert werden

## Adapter-Skizze

```ts
// src/server/sources/epost-api.ts
const ALL_TYPES = [
  "CLASSIC_LETTER", "SMART_LETTER", "SMART_LETTER_ANSWER",
  "SIMPLE_SHORT_MESSAGE", "INCAMAIL", "SECURESEND"
];

async function listSince(fromDate: Date) {
  const params = new URLSearchParams();
  ALL_TYPES.forEach(t => params.append("letter-types", t));
  params.set("from-date", fromDate.toISOString().slice(0, 10));
  params.set("limit", "1000");
  const res = await fetch(`${BASE}/epost/v2/letters?${params}`, {
    headers: { "X-API-KEY": process.env.EPOST_API_KEY! }
  });
  return res.json();
}

async function downloadPdf(letterId: string): Promise<Buffer> {
  const res = await fetch(`${BASE}/epost/v2/letters/${letterId}/content`, {
    headers: { "X-API-KEY": process.env.EPOST_API_KEY! }
  });
  return Buffer.from(await res.arrayBuffer());
}
```

## Plan-Korrektur

- ✅ Source = ePost API (nicht Playwright/IMAP)
- ✅ Subscription-Key allein reicht — kein OAuth-Token-Flow nötig
- ⚠️ Volumen: **208 statt geschätzt 30–100** — initial-Sync braucht ~5min und kostet bei Sonnet ~$4 (PDF-Tokens)
- ⚠️ `letterTitle` ist nutzlos — UI muss extrahierten Titel/Subject anzeigen, nicht das API-Feld
