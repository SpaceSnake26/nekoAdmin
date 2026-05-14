# Inbox-Views: Cards + Grouping-Toggle — Design Spec

_Erstellt: 2026-04-21_

## Kontext

Der Posteingang zeigt aktuell eine einzige Ansicht: eine dichte Tabelle mit chronologischer Sortierung. Mit 208 Briefen funktioniert das, aber:

- Keine visuelle Erkennung des Briefs möglich (nur Text, keine PDF-Vorschau)
- Mahnungs-Ketten werden nicht als Einheit sichtbar — gleicher Brief erscheint mehrfach als "Letzte Mahnung" / "2. Mahnung" / "Original", ohne sichtbaren Zusammenhang
- Gruppen mit verschiedenen documentTypes (z.B. Steuer-Info + Steuer-Rechnung + Steuer-Mahnung) fallen optisch auseinander obwohl sie zusammengehören

## Ziel

Zwei orthogonale Ansichts-Achsen, die den User kontrolliert zwischen Daten-Dichte (List) und Übersicht (Cards) sowie zwischen Eingangs-Chronologie (Flach) und Gruppen-Kontext (Gruppiert) umschalten lassen.

| | List (Tabelle) | Cards (Kacheln) |
|---|---|---|
| Flach | bereits vorhanden | **neu** |
| Gruppiert | **neu** | **neu** |

## Entscheidungen (vom User bestätigt)

1. **Default-View:** `view=cards` + `group=on`
2. **Thumbnails:** pre-generiert bei Ingest via `pdftoppm` (erste Seite, 60 DPI, JPEG); Backfill für bestehende 208 Briefe via Script
3. **Gruppen-Card:** Neuester Brief als Hero (Subject, Thumbnail, Betrag, Frist), Timeline-Strip darunter
4. **Timeline-Style:** Farbige Dots (nach `documentType`) mit Monat- und Typ-Kürzel-Labels; proportionale Zeit-Abstände; neuester rechts

## Architektur

### URL-State

Alle View-/Filter-Modi in der URL, Bookmarking + Back-Button-freundlich.

```
/inbox?view={list|cards}&group={flat|by-group}&type=...&area=...&pay=...&tag=...&sort=...&dir=...
```

- `view` default: `cards`
- `group` default: `by-group`
- Bestehende Filter (`type`, `area`, `pay`, `tag`, `sort`, `dir`) bleiben unverändert

### Komponenten-Baum

```
src/app/inbox/page.tsx                       # parses URL, dispatches to <ListView>/<CardView>
└── src/components/inbox/
    ├── view-toggle.tsx           # List/Cards segment (icons)
    ├── group-toggle.tsx          # Flach/Gruppiert segment (icons)
    ├── filter-bar.tsx            # extrahiert aus bestehender page.tsx
    ├── list-view/
    │   ├── list-flat.tsx         # aktuelle Tabelle, refactored
    │   └── list-grouped.tsx      # Master-Row + collapsible Sub-Rows
    ├── card-view/
    │   ├── card-grid.tsx         # responsive 1/2/3-col grid container
    │   ├── letter-card.tsx       # Einzel-Brief
    │   ├── group-card.tsx        # Neuester Brief als Hero + Timeline
    │   └── timeline-strip.tsx    # Dots + Labels, colored by documentType
    └── group-indicator.tsx       # ⟳-Badge auf Einzel-Cards wenn gruppiert
```

**Isolation:** Jede View-Komponente ist self-contained, kriegt Props (`letters` oder `groups`) und rendert. Toggle-Komponenten sind präsentational, Navigation via `<Link>`-URL-Builder.

### Daten-Queries

#### Bestehend: `listInbox({ ... })` — Flach-Modus, unverändert

#### Neu: `listInboxGrouped({ ... })`

Einfacher als zwei getrennte Queries: wir holen **alle** Briefe die den Filter matchen (genau wie im Flach-Modus), gruppieren sie server-seitig in JS nach `groupId`, und behandeln Briefe ohne `groupId` als eigenen "Solo-Bucket" (also eine virtuelle Gruppe mit genau diesem einen Brief).

**Algorithmus (server-side):**
```ts
const letters = await listInbox(filters);  // gleiche Query wie Flach

// Bucket-Key: echte groupId, sonst "solo:<letterId>"
const buckets = new Map<string, Letter[]>();
for (const l of letters) {
  const key = l.groupId ?? `solo:${l.id}`;
  (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(l);
}

// Pro Bucket: neuester Brief als "Hero", Rest als "Siblings" (älteste zuerst)
// Bucket-Sortierung: nach maxReceivedAt DESC
const groups = [...buckets.values()]
  .map((ls) => {
    const sorted = ls.sort((a, b) => b.receivedAt - a.receivedAt);  // newest first
    return {
      hero: sorted[0],
      siblings: sorted.slice(1).reverse(),  // oldest first for timeline left-to-right
      latestReceivedAt: sorted[0].receivedAt,
      isSolo: ls.length === 1,
    };
  })
  .sort((a, b) => b.latestReceivedAt - a.latestReceivedAt);

// Für Solo-Buckets (length === 1 AND no real groupId): kein Group-Fetch,
// einfach direkt als Letter-Card rendern
// Für Multi-Briefe-Buckets: Group-Details aus letter_groups-Tabelle nachziehen
//   (title, status, amount) falls einer der Briefe eine groupId hat
```

**Vorteile dieser Struktur:**
- Eine Query statt zwei → weniger DB-Roundtrips
- Briefe ohne `groupId` (status=error oder status=raw) werden **automatisch** als 1-Brief-Buckets mitangezeigt — sie verschwinden nicht
- 1-Brief-Buckets (echte Gruppen mit nur einem Brief UND solo-Buckets ohne groupId) werden identisch gerendert: wie eine normale Letter-Card, ohne Timeline-Strip
- Filter-Semantik ist automatisch "zeig mir Gruppen, in denen ein Brief den Filter matcht" — weil wir eh die gefilterten Letters holen und gruppieren

**Group-Title/Status für Multi-Brief-Buckets:** Nach dem Gruppieren ein zweiter kleiner Query `SELECT id, title, status FROM letter_groups WHERE id IN (...)` um Group-Metadaten für die Hero-Card zu ergänzen.

### Card-Layout — Letter-Card (Einzel, flach)

Grid: 3-col ≥1280px, 2-col 768–1279px, 1-col <768px. Card: 380×220px.

```
┌───────────────────────────────────────┐
│ ┌────┐  MAHNUNG · BVG · LETZTE        │   ← meta labels
│ │    │  Vita BVG Letzte Mahnung       │   ← subject (2 lines max)
│ │ ▒▒ │  April 2026                    │
│ │    │  Sammelstiftung Vita            │   ← sender
│ │    │  ─────────────────────          │
│ │    │  CHF 3'354.60         +7T ⚠   │   ← amount + due
│ └────┘                                 │
│ ● offen  [mahnung] [mehrteilig]   ⟳3  │   ← status + tags + group-indicator
└───────────────────────────────────────┘
```

- Links: 80×110 PDF-Thumbnail (aspect 3:4)
- Oben rechts: 3 meta labels (type/area/reminder) in uppercase tracking-wider
- Mitte: Subject prominent, Sender muted
- Unten: Betrag + Frist (color-coded: overdue=destructive, soon=warning)
- Footer: Status-Pill links, Tags mittig, ⟳-Badge rechts (wenn Brief in Multi-Brief-Group)
- **⟳-Badge klickbar** → `/groups/[id]`

### Card-Layout — Group-Card (Gruppiert)

Gleiche Grundfläche wie Letter-Card + Timeline-Extension unten. Höhe wächst auf ~290px.

```
┌───────────────────────────────────────┐
│ ┌────┐  MAHNUNG · BVG · LETZTE        │   ← labels des neuesten Briefs
│ │    │  Vita BVG Letzte Mahnung       │   ← neuester Brief = HERO
│ │ ▒▒ │  April 2026                    │
│ │    │  Sammelstiftung Vita            │
│ │    │  ─────────────────────          │
│ │    │  CHF 3'354.60         +7T ⚠   │
│ └────┘                                 │
│ ● offen  [mahnung]                     │
│ ═══════════════════════════════════════│   ← subtle divider
│ ⟳ Gruppe · 3 Briefe                    │
│                                         │
│  ●───────●───────●                      │   ← Timeline, neuester rechts
│  Jun     Apr     Apr                    │   ← Monat
│  Orig   2.Mn   Letzte                  │   ← Typ-Kürzel
└───────────────────────────────────────┘
```

**Timeline-Details:**
- SVG-based für saubere Proportionen
- Dots farbig nach `documentType`:
  - `rechnung` → emerald
  - `mahnung` → amber
  - `betreibung` → destructive (rose)
  - `verfuegung` → violet
  - `information` → slate
  - `police` → teal
  - `aufforderung` → blue
  - andere → muted
- Monat-Label: `Jan`, `Feb`, ... (lokalisiert DE)
- Typ-Kürzel: `Orig`, `1.Mn`, `2.Mn`, `Letzte`, `Betr`, `Info`, `Verf`, `Rg`, `Auf`, `Po`, `Vt`, `Ka`, `Bs`, `Wb`, `?`
- Proportional spacing: Zeit-Lücken als echte Distanzen zwischen Dots (useful für "ah, 10 Monate Pause zwischen 1. und 2. Mahnung")
- Hover auf Dot → Tooltip mit vollem Datum + Subject
- Click auf Dot → direkt zu dem Brief (`/letters/[id]`)
- Click auf gesamte Timeline-Leiste → `/groups/[id]`
- **Bei 1-Brief-Gruppen:** Timeline-Strip wird nicht gerendert → Group-Card sieht identisch zur Letter-Card aus

### Group-Indicator auf Letter-Cards (Flach-Modus)

Selbst im Flach-Modus soll man erkennen wenn ein Brief in einer Multi-Brief-Gruppe ist.

Kleines `⟳N`-Badge rechts unten auf der Card:
```
                                     ⟳ 3
```
- Nur wenn `letterCount > 1` für die Gruppe
- Hover-Tooltip: "Brief ist Teil einer Gruppe mit 3 Briefen"
- Click → `/groups/[id]`

### List-Views

#### List-Flat
Bestehende Tabelle, unverändert, nur in eigene Komponente extrahiert.

#### List-Grouped
Thread-Style (wie Gmail Threads):

```
┌─────┬─────────────────────────────────────────────────────────┐
│ ▼⟳3 │ Vita BVG Mahnungs-Kette · Sammelstiftung Vita · CHF ...│  ← Master-Row (bold)
├─────┼─────────────────────────────────────────────────────────┤
│     │   17.04.2026  Vita BVG Letzte Mahnung     CHF 3'354.60 │  ← Sub-Row indented
│     │   15.04.2026  Vita BVG 2. Mahnung April   CHF 3'254.60 │
│     │   20.06.2025  Vita BVG Zahlungsaufschub   CHF 2'861.50 │
└─────┴─────────────────────────────────────────────────────────┘
┌─────┬─────────────────────────────────────────────────────────┐
│ ▶⟳1 │ AKSO Lohndeklaration 2025 · Ausgleichskasse ...        │  ← Collapsed
└─────┴─────────────────────────────────────────────────────────┘
```

- Master-Row zeigt Group-Title + Sender + Summen-Betrag + **⟳N**-Badge
- Expand/Collapse via ▶/▼ Chevron am Anfang
- Sub-Rows enthalten normale Letter-Spalten aber leicht eingerückt und dezenter Hintergrund
- Bei 1-Brief-Gruppen: direkt als normale Row rendern, kein Wrapping
- State (expanded/collapsed) per Group-ID in localStorage (nicht in URL — zu volatil)

### PDF-Thumbnail-Pipeline

**Generierung:** `pdftoppm` aus poppler (already installed).

```bash
pdftoppm -jpeg -jpegopt quality=75 -r 60 -f 1 -l 1 \
  input.pdf /path/to/output  # produces output-1.jpg
```

- DPI 60 → ~380×550px für A4-Hochformat → gut für 80×110 Anzeige mit Retina-Ersatz
- JPEG Quality 75 → ~25-35 KB pro Thumbnail
- 208 Briefe × 30 KB ≈ 6 MB Speicher

**Storage:** `data/thumbnails/{letterId}.jpg` (convention-based path, kein DB-Feld nötig)

**Pipeline-Integration:** Neue Datei `src/server/pipeline/thumbnail.ts` mit `generateThumbnail(pdfPath, letterId)`. Wird nach `ingestLetter` aufgerufen (synchron im ingest-Schritt oder async in einem separaten Pass).

**API-Route:** `src/app/api/thumbnail/[id]/route.ts` streamt die JPEG-Datei mit `Content-Type: image/jpeg` und langem `Cache-Control` (immutable, thumbnails ändern sich nicht nach Generation).

**Fallback:** Wenn keine thumbnail-Datei existiert (Race-Condition oder Generierung fehlgeschlagen), rendert die Card einen Placeholder-Block mit documentType-Farbe + Dokument-Icon.

**Backfill:** `scripts/backfill-thumbnails.ts` läuft durch alle 208 bestehenden Briefe, erzeugt Thumbnails falls fehlend. Idempotent. Erwartete Laufzeit: ~1-2 min (208 × ~500ms).

### Performance

- **Lazy-Loading:** `<img loading="lazy">` auf allen Thumbnails → nur sichtbare werden geladen
- **Pagination:** Nicht im MVP — 208 Karten rendern flott. Bei 500+ später nachrüsten.
- **No virtual scrolling:** Overkill für diese Dimension
- **Staggered reveal:** bereits vorhanden via `.stagger-child` CSS-Klasse, wiederverwendet

### Toggle-UX

Beide Toggles sind Segment-Controls mit Icon+Label, Active-State mit Background-Fill. Platziert in der Header-Zeile neben der Suche.

```
Posteingang                                    ┌─ Suche ─────┐
208 Briefe              ┌─────┬─────┐ ┌──────┬──────────┐
                        │List │Cards│ │Flach │Gruppiert │
                        └─────┴─────┘ └──────┴──────────┘
```

- Icons: List=`Rows3`, Cards=`LayoutGrid`, Flach=`Layers`, Gruppiert=`FolderOpen` (aus lucide-react)
- Click-Handler: preserviert alle anderen URL-Params, swapt nur `view=` bzw `group=`
- `<Link>`-basiert, kein Client-State, funktioniert mit Back/Forward

## Edge Cases

- **Thumbnail-Generierung schlägt fehl:** Fallback-Placeholder, Fehler loggen, anderen Brief nicht blockieren
- **Brief hat keine `groupId`:** Kommt vor bei status="error" oder status="raw" (Brief noch nicht durch Group-Pipeline gelaufen). Im Gruppiert-Modus wird der Brief als **Solo-Bucket** behandelt — gerendert wie eine 1-Brief-Gruppe, also als normale Letter-Card ohne Timeline. **Wird nicht geskippt.**
- **Group hat 1 Brief (echte Gruppe oder Solo-Bucket):** Timeline-Strip wird nicht gerendert, Card sieht aus wie Letter-Card. Group-Indicator (⟳N) wird auch nicht angezeigt (weil N=1 nicht aussagekräftig).
- **Group hat 10+ Briefe:** Timeline wird breit. Erstmal alle rendern, CSS `overflow-x: auto` wenn nötig. Bei 20+ kondensieren zu "5 Briefe ... 3 Briefe ..." (post-MVP).
- **Brief in zwei Gruppen:** Im aktuellen Schema kann ein Brief nur EINE `groupId` haben (nullable FK, nicht M2M). Kein Edge-Case.
- **Schneller Toggle-Klick:** URL ist Source-of-Truth, Next.js navigiert server-side, kein Flicker.

## Testing Strategy

- Mocked Prisma/Drizzle für Unit-Tests der `listInboxGrouped()`-Query → verify filter semantics (EXISTS-Klausel, Sortierung nach latest_received)
- E2E über Dev-Server: Navigation durch alle 4 Modi, Back-Button, Filter-Interaktion
- Visuelle Verifikation: Chrome MCP Screenshots je Modus
- Thumbnails: manuell 3-5 Briefe inspizieren (Lesbarkeit bei 60 DPI)

## Implementierungs-Reihenfolge

1. **Thumbnail-Pipeline** (~1h)
   - `src/server/pipeline/thumbnail.ts` — `generateThumbnail(pdfPath, letterId)`
   - Integration in `ingest.ts` (nach PDF-Save)
   - `src/app/api/thumbnail/[id]/route.ts`
   - `scripts/backfill-thumbnails.ts` + run für die 208 bestehenden
2. **URL-State + Toggles** (~45min)
   - Parse `view` + `group` aus searchParams
   - `<ViewToggle>` + `<GroupToggle>` Komponenten
   - Filter-Bar in eigene Komponente extrahieren
3. **Letter-Card + Card-Grid** (~1h)
   - `LetterCard` mit allen Metadaten
   - `CardGrid` responsive Container
   - Group-Indicator-Badge
4. **Group-Card + Timeline-Strip** (~1.5h)
   - `GroupCard` mit Hero + Timeline
   - `TimelineStrip` SVG-Component
   - Farb-Mapping per documentType
5. **List-Grouped** (~1h)
   - Master + Sub-Rows
   - Expand/Collapse mit localStorage
6. **Queries** (~45min)
   - `listInboxGrouped()` mit EXISTS-Filter
   - Daten-Verheiratung (neuestesLetter + siblings pro Gruppe)
7. **Page-Orchestrierung** (~30min)
   - `inbox/page.tsx` dispatched zur richtigen View-Kombi
8. **QA + Screenshots** (~30min)

**Gesamt: ~6–7h.**

## Scope-Ausschlüsse (YAGNI)

- Keyboard-Navigation zwischen Cards (J/K)
- Drag-and-Drop zum Gruppieren
- Kompakt-Modus für kleinere Cards
- Virtualisierung für 500+ Briefe
- Inline-Edit von Titel/Status direkt aus der Card
- Mini-Thumbnails der Geschwister-Briefe (User-Entscheidung: Dots + Label reichen)

## Kritische Files (werden erstellt/modifiziert)

- `src/app/inbox/page.tsx` — Orchestrator
- `src/components/inbox/` — alle View-Komponenten (neu)
- `src/server/queries/letters.ts` — `listInboxGrouped()` ergänzen
- `src/server/pipeline/thumbnail.ts` — neu
- `src/server/pipeline/ingest.ts` — Thumbnail-Hook
- `src/app/api/thumbnail/[id]/route.ts` — neu
- `scripts/backfill-thumbnails.ts` — neu

## Verifikation nach Implementierung

1. `npm run backfill:thumbnails` läuft sauber durch, 208 Thumbnails in `data/thumbnails/`
2. http://127.0.0.1:3030/inbox öffnet Cards-Gruppiert-Modus standardmäßig
3. Toggle List↔Cards: Daten bleiben, Layout wechselt, URL reflektiert Wahl
4. Toggle Flach↔Gruppiert: Gruppen erscheinen/verschwinden korrekt
5. In Gruppiert-Cards: Timeline zeigt 3+ Briefe mit korrekten Farben/Monaten
6. Click auf Timeline-Dot → navigiert zum richtigen Brief
7. Click auf ⟳-Badge → navigiert zur richtigen Gruppe
8. Alle bestehenden Filter (Typ/Bereich/Zahlung/Tags) funktionieren in beiden Modi
9. URL `?view=cards&group=on&type=mahnung&area=bvg` produziert erwartetes Ergebnis
10. Screenshots der 4 Modi in `/tmp/` zur Review
