import { desc, sql } from "drizzle-orm";
import { Megaphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { getSocialProvider } from "@/lib/social-provider";
import { db, schema } from "@/server/db";
import type { SocialPlatform, SocialStatus } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  facebook: "Facebook",
  threads: "Threads",
  bluesky: "Bluesky",
};

// Brand icons aren't in this lucide-react fork — use a colored dot per platform.
const PLATFORM_TONE: Record<SocialPlatform, string> = {
  linkedin: "bg-sky-500",
  instagram: "bg-pink-500",
  tiktok: "bg-foreground",
  x: "bg-foreground",
  youtube: "bg-red-500",
  facebook: "bg-blue-600",
  threads: "bg-foreground/70",
  bluesky: "bg-sky-400",
};

const STATUS_TONE: Record<SocialStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  scheduled: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/40",
  posted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
  failed: "bg-destructive/15 text-destructive border-destructive/40",
};

export default async function SocialPage() {
  const provider = getSocialProvider();
  const [status, posts, stats] = await Promise.all([
    provider.checkConnection(),
    db
      .select()
      .from(schema.socialPosts)
      .orderBy(desc(schema.socialPosts.createdAt))
      .limit(50),
    db
      .select({
        draft: sql<number>`count(*) filter (where status = 'draft')`,
        scheduled: sql<number>`count(*) filter (where status = 'scheduled')`,
        posted: sql<number>`count(*) filter (where status = 'posted')`,
        failed: sql<number>`count(*) filter (where status = 'failed')`,
      })
      .from(schema.socialPosts),
  ]);

  const counts = stats[0] ?? { draft: 0, scheduled: 0, posted: 0, failed: 0 };

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      <section className="grid grid-cols-12 gap-8 mb-10">
        <div className="col-span-12 lg:col-span-8">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Markt · Social · Lane Awareness
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-3 text-foreground">
            {status.configured && status.reachable ? (
              <>
                Verbunden mit{" "}
                <span className="text-violet-600 dark:text-violet-400">
                  Postiz
                </span>{" "}
                ·{" "}
                <span className="text-foreground">
                  {status.connectedPlatforms.length}
                </span>{" "}
                Plattform
                {status.connectedPlatforms.length === 1 ? "" : "en"}
              </>
            ) : (
              <span className="text-muted-foreground">
                Social-Provider noch nicht verbunden.
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground max-w-[60ch] leading-relaxed">
            Posts, Reels und Shorts als Broadcast-Content über
            LinkedIn / Instagram / TikTok / X / YouTube. Rechtlich
            unproblematisch &mdash; kein 1:1-Werbung.
          </p>
        </div>
        <aside className="col-span-12 lg:col-span-4 flex flex-col items-end gap-2">
          {status.connectedPlatforms.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 justify-end">
              {status.connectedPlatforms.map((p) => (
                <Badge
                  key={p}
                  variant="secondary"
                  className="text-[10px] font-mono uppercase border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1.5"
                >
                  <span className={`size-1.5 rounded-full ${PLATFORM_TONE[p]}`} />
                  {PLATFORM_LABEL[p]}
                </Badge>
              ))}
            </div>
          ) : null}
        </aside>
      </section>

      {!status.configured ? <SetupHint /> : null}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard label="Entwurf" value={Number(counts.draft)} accent="muted" />
        <StatCard label="Geplant" value={Number(counts.scheduled)} accent="sky" />
        <StatCard
          label="Veröffentlicht"
          value={Number(counts.posted)}
          accent="emerald"
        />
        <StatCard
          label="Fehlgeschlagen"
          value={Number(counts.failed)}
          accent={Number(counts.failed) > 0 ? "destructive" : "muted"}
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-border">
          <h2 className="text-sm font-medium tracking-tight text-foreground/90 flex items-center gap-2">
            <Megaphone className="size-3.5 text-violet-500" />
            Letzte Posts
          </h2>
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
            {posts.length}
          </span>
        </div>
        {posts.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground border border-dashed border-border rounded-md bg-muted/20">
            Noch keine Posts. Posten via{" "}
            <code className="font-mono">POST /api/social/publish</code> oder
            (folgt) den UI-Composer auf dieser Seite.
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-md bg-card shadow-sm">
            {posts.map((p) => (
              <li key={p.id} className="px-4 py-3 text-sm">
                <div className="flex items-center gap-3 mb-1.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] uppercase tracking-wider font-semibold border ${STATUS_TONE[p.status as SocialStatus]}`}
                  >
                    {p.status}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {p.platforms.map((pl) => (
                      <Badge
                        key={pl}
                        variant="secondary"
                        className="text-[10px] font-mono gap-1.5"
                      >
                        <span
                          className={`size-1.5 rounded-full ${PLATFORM_TONE[pl as SocialPlatform] ?? "bg-foreground/60"}`}
                        />
                        {PLATFORM_LABEL[pl as SocialPlatform] ?? pl}
                      </Badge>
                    ))}
                  </div>
                  <span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">
                    {formatDate(p.scheduledFor ?? p.postedAt ?? p.createdAt)}
                  </span>
                </div>
                <p className="text-foreground/90 line-clamp-2 whitespace-pre-wrap">
                  {p.title ? <strong>{p.title}: </strong> : null}
                  {p.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "sky" | "emerald" | "violet" | "amber" | "muted" | "destructive";
}) {
  const map = {
    sky: { bar: "bg-sky-500", ring: "ring-sky-500/10", text: "text-sky-700 dark:text-sky-400" },
    emerald: { bar: "bg-emerald-500", ring: "ring-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400" },
    violet: { bar: "bg-violet-500", ring: "ring-violet-500/10", text: "text-violet-700 dark:text-violet-400" },
    amber: { bar: "bg-amber-500", ring: "ring-amber-500/10", text: "text-amber-700 dark:text-amber-400" },
    muted: { bar: "bg-muted-foreground/30", ring: "", text: "text-foreground" },
    destructive: { bar: "bg-destructive", ring: "ring-destructive/10", text: "text-destructive" },
  } as const;
  const a = map[accent];
  return (
    <div className={`relative border border-border rounded-md p-4 bg-card shadow-sm ring-1 ${a.ring}`}>
      <div className={`absolute top-0 left-0 h-full w-0.5 ${a.bar} rounded-l-md`} />
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1 font-semibold">
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums leading-none ${a.text}`}>
        {value}
      </div>
    </div>
  );
}

function SetupHint() {
  return (
    <div className="border border-border rounded-md p-5 mb-10 bg-muted/30">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2 font-medium">
        Postiz verbinden
      </div>
      <ol className="text-sm text-foreground/90 leading-relaxed space-y-2 list-decimal list-inside">
        <li>
          Postiz selbst hosten:{" "}
          <a
            href="https://github.com/gitroomhq/postiz-app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            github.com/gitroomhq/postiz-app
          </a>
        </li>
        <li>
          In Postiz die gewünschten Plattformen via OAuth verbinden
          (LinkedIn, Instagram, TikTok, X, YouTube …).
        </li>
        <li>
          Postiz → Settings → API Keys: neuen Key anlegen und in
          <code className="font-mono text-xs"> .env.local</code> setzen:
          <pre className="text-xs font-mono bg-background border border-border rounded-sm mt-2 p-2 leading-relaxed">
            {`SOCIAL_PROVIDER=postiz
POSTIZ_BASE_URL=https://postiz.nekosys.ch
POSTIZ_API_KEY=••••`}
          </pre>
        </li>
      </ol>
    </div>
  );
}
