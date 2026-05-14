import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import {
  EVENT_LOCATIONS,
  EVENT_LOCATION_LABELS,
  type EventLocation,
} from "@/server/db/schema";
import { getEventCounts, listEvents } from "@/server/queries/events";
import { AddEventDialog } from "@/components/events/add-event-dialog";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ location?: string; view?: string }>;
}

export default async function EventsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const location =
    sp.location && (EVENT_LOCATIONS as readonly string[]).includes(sp.location)
      ? (sp.location as EventLocation)
      : null;
  const past = sp.view === "past";

  const [events, counts] = await Promise.all([
    listEvents({ location, past }),
    getEventCounts(),
  ]);

  function buildHref(overrides: Record<string, string | null>): string {
    const next = new URLSearchParams();
    if (location) next.set("location", location);
    if (past) next.set("view", "past");
    for (const [k, v] of Object.entries(overrides)) {
      if (v == null) next.delete(k);
      else next.set(k, v);
    }
    const s = next.toString();
    return s ? `/events?${s}` : "/events";
  }

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      <section className="flex items-end justify-between gap-8 mb-10 border-b border-border pb-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Markt · Events
          </div>
          <h1 className="text-3xl font-medium tracking-tight">
            IT-Events nach Region
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Konferenzen, Meetups und Branchenevents — kuratiert für die fünf
            Standorte, an denen das Team aktiv ist.
          </p>
        </div>
        <AddEventDialog defaultLocation={location ?? undefined} />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-5 border-t border-border pt-5 mb-10">
        {EVENT_LOCATIONS.map((loc) => {
          const c = counts[loc] ?? { upcoming: 0, past: 0 };
          return (
            <Link
              key={loc}
              href={buildHref({ location: loc })}
              className={`block group ${location === loc ? "" : ""}`}
            >
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1 group-hover:text-foreground transition-colors">
                {EVENT_LOCATION_LABELS[loc]}
              </div>
              <div
                className={`text-2xl font-medium tabular-nums leading-none ${
                  location === loc ? "text-primary" : "text-foreground"
                }`}
              >
                {c.upcoming}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 font-mono tabular-nums">
                {c.upcoming === 1 ? "kommend" : "kommend"} · {c.past} vergangen
              </div>
            </Link>
          );
        })}
      </section>

      <section className="flex items-center gap-2 text-[12px] mb-6">
        <Link
          href={buildHref({ location: null })}
          className={`px-2.5 py-1 transition-colors ${
            !location
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Alle Regionen
        </Link>
        <span className="text-border">·</span>
        <Link
          href={buildHref({ view: past ? null : "past" })}
          className={`px-2.5 py-1 transition-colors ${
            past
              ? "text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {past ? "Vergangene zeigen" : "Vergangene zeigen"}
        </Link>
        {past ? (
          <Link
            href={buildHref({ view: null })}
            className="px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            ← zu kommenden
          </Link>
        ) : null}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-border">
          <h2 className="text-sm font-medium tracking-tight text-foreground/90">
            {past ? "Vergangene Events" : "Kommende Events"}
            {location ? ` · ${EVENT_LOCATION_LABELS[location]}` : ""}
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
            {events.length}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Keine Events erfasst. Legen Sie oben einen an.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="py-4 flex gap-5">
                <div className="shrink-0 w-20 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {e.startsAt.toLocaleDateString("de-CH", { month: "short" })}
                  </div>
                  <div className="text-2xl font-medium tabular-nums leading-none mt-0.5">
                    {e.startsAt.toLocaleDateString("de-CH", { day: "2-digit" })}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground tabular-nums mt-1">
                    {e.startsAt.toLocaleTimeString("de-CH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {EVENT_LOCATION_LABELS[e.locationCode as EventLocation] ??
                        e.locationCode}
                    </span>
                    {e.tags.slice(0, 4).map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="text-sm font-medium text-foreground">
                    {e.url ? (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline inline-flex items-center gap-1.5"
                      >
                        {e.title}
                        <ExternalLink className="size-3 text-muted-foreground" />
                      </a>
                    ) : (
                      e.title
                    )}
                  </h3>
                  {(e.city || e.venue) ? (
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="size-3" />
                      {[e.venue, e.city].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                  {e.description ? (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {e.description}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right text-[11px] text-muted-foreground font-mono tabular-nums">
                  {e.endsAt ? (
                    <span>bis {formatDate(e.endsAt)}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
