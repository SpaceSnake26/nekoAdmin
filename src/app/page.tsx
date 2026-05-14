import Link from "next/link";
import { ArrowUpRight, Circle, Dot } from "lucide-react";

import { diffDays } from "@/lib/date";
import {
  documentTypeLabel,
  formatAmount,
  formatDate,
  reminderLabel,
  shortId,
} from "@/lib/format";
import {
  getDashboardStats,
  getLastSync,
  getOpenTasks,
  getRecentLetters,
  getUpcomingDeadlines,
} from "@/server/queries/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, deadlines, tasks, recent, lastSync] = await Promise.all([
    getDashboardStats(),
    getUpcomingDeadlines(8),
    getOpenTasks(6),
    getRecentLetters(6),
    getLastSync(),
  ]);

  const now = new Date();
  const overdueTotal = Number(stats.overdueAmount) || 0;
  const openTotal = Number(stats.openAmount) || 0;
  const hasAlert = stats.overdueCount > 0;

  return (
    <div className="px-8 py-10 max-w-[1400px] mx-auto">
      {/* Hero */}
      <section className="grid grid-cols-12 gap-8 mb-14">
        <div className="col-span-12 lg:col-span-8">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            Übersicht · {formatDate(now)}
          </div>
          <h1 className="text-4xl md:text-5xl font-medium tracking-tighter leading-[1.05] mb-4 text-foreground">
            {hasAlert ? (
              <>
                <span className="text-destructive">
                  {stats.overdueCount} Rechnung{stats.overdueCount === 1 ? "" : "en"}
                </span>{" "}
                überfällig.
                <br />
                <span className="text-muted-foreground">
                  Gesamt {formatAmount(overdueTotal)}.
                </span>
              </>
            ) : stats.dueSoonCount > 0 ? (
              <>
                {stats.dueSoonCount} Rechnung{stats.dueSoonCount === 1 ? "" : "en"}
                {" "}diese Woche fällig.
              </>
            ) : (
              <>
                Alles erledigt.
                <br />
                <span className="text-muted-foreground">Keine dringenden Posten.</span>
              </>
            )}
          </h1>
          <p className="text-sm text-muted-foreground max-w-[58ch] leading-relaxed">
            {lastSync
              ? `Letzter Sync ${formatDate(lastSync.startedAt)} — ${lastSync.newLetters} neue Briefe erfasst.`
              : "Noch kein Sync durchgeführt. Oben rechts starten."}
          </p>
        </div>

        {/* Side panel with quick counts — asymmetric */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col justify-end">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 border-t border-border pt-5">
            <StatInline
              label="Offen"
              value={stats.openCount}
              sub={formatAmount(openTotal)}
            />
            <StatInline
              label="Diese Woche"
              value={stats.dueSoonCount}
              sub="fällig"
              tone={stats.dueSoonCount > 0 ? "warn" : "default"}
            />
            <StatInline
              label="Überfällig"
              value={stats.overdueCount}
              sub={formatAmount(overdueTotal)}
              tone={stats.overdueCount > 0 ? "danger" : "default"}
            />
            <StatInline
              label="Aufgaben"
              value={stats.openTaskCount}
              sub="offen"
            />
          </div>
        </aside>
      </section>

      {/* Main content: asymmetric split 8/4 */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-10">
          <Block title="Nächste Fälligkeiten" count={deadlines.length}>
            {deadlines.length === 0 ? (
              <EmptyState>Keine offenen Rechnungen mit Frist.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {deadlines.map((d, i) => {
                  const days = d.dueDate ? diffDays(now, d.dueDate) : null;
                  const overdue = days != null && days < 0;
                  const soon = days != null && days >= 0 && days <= 7;
                  const tone = overdue ? "danger" : soon ? "warn" : "default";
                  return (
                    <li
                      key={d.id}
                      className="stagger-child"
                      style={{ ["--index" as never]: i } as React.CSSProperties}
                    >
                      <Link
                        href={`/letters/${d.id}`}
                        className="group relative flex items-center gap-5 py-4 pr-3 pl-4 -ml-4 hover:bg-muted/40 transition-colors rounded-md"
                      >
                        <span
                          className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${
                            tone === "danger"
                              ? "bg-destructive"
                              : tone === "warn"
                                ? "bg-warning"
                                : "bg-transparent group-hover:bg-border"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground truncate">
                            {d.subject ?? "(ohne Titel)"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <span className="truncate">
                              {d.canonicalName ?? d.senderRawName ?? "Unbekannt"}
                            </span>
                            {d.reminderLevel && d.reminderLevel > 0 ? (
                              <>
                                <Dot className="size-3 text-border shrink-0" />
                                <span className="text-warning">
                                  {reminderLabel(d.reminderLevel)}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <div className="text-sm font-mono tabular-nums text-foreground">
                            {formatAmount(d.amount, d.currency ?? "CHF")}
                          </div>
                          <div
                            className={`text-[11px] font-mono tabular-nums ${
                              tone === "danger"
                                ? "text-destructive"
                                : tone === "warn"
                                  ? "text-warning"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {overdue
                              ? `−${Math.abs(days!)}T`
                              : soon
                                ? `+${days}T`
                                : formatDate(d.dueDate)}
                          </div>
                        </div>
                        <ArrowUpRight className="size-3.5 text-border group-hover:text-foreground transition-colors shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Block>

          <Block title="Neueste Briefe" count={recent.length}>
            <ul className="divide-y divide-border">
              {recent.map((r, i) => (
                <li
                  key={r.id}
                  className="stagger-child"
                  style={{ ["--index" as never]: i } as React.CSSProperties}
                >
                  <Link
                    href={`/letters/${r.id}`}
                    className="flex items-center gap-4 py-3 text-sm hover:text-foreground transition-colors"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums shrink-0 w-16">
                      {formatDate(r.receivedAt)}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-foreground">
                      {r.subject ?? "(ohne Titel)"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[16ch]">
                      {r.canonicalName ?? r.senderRawName ?? "—"}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0 w-20 text-right">
                      {documentTypeLabel(r.documentType)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Block>
        </div>

        <aside className="col-span-12 lg:col-span-4">
          <Block title="Offene Aufgaben" count={tasks.length}>
            {tasks.length === 0 ? (
              <EmptyState>Alles erledigt.</EmptyState>
            ) : (
              <ul className="space-y-4">
                {tasks.map((t, i) => (
                  <li
                    key={t.id}
                    className="stagger-child"
                    style={{ ["--index" as never]: i } as React.CSSProperties}
                  >
                    <Link
                      href={`/letters/${t.id}`}
                      className="group flex gap-3 text-sm"
                    >
                      <Circle
                        className="size-3.5 mt-0.5 text-muted-foreground/60 group-hover:text-primary shrink-0 transition-colors"
                        strokeWidth={1.75}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground/90 group-hover:text-foreground transition-colors leading-snug">
                          {t.subject}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                          {t.dueDate ? (
                            <span className="font-mono tabular-nums">
                              bis {formatDate(t.dueDate)}
                            </span>
                          ) : (
                            <span>keine Frist</span>
                          )}
                          {t.canonicalName || t.senderRawName ? (
                            <>
                              <Dot className="size-3 text-border" />
                              <span className="truncate">
                                {t.canonicalName ?? t.senderRawName}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </aside>
      </section>
    </div>
  );
}

function StatInline({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: number | string;
  sub: string;
  tone?: "default" | "warn" | "danger";
}) {
  const color =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-warning"
        : "text-foreground";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`text-2xl font-medium tabular-nums leading-none ${color}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 font-mono tabular-nums">
        {sub}
      </div>
    </div>
  );
}

function Block({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-4 pb-2 border-b border-border">
        <h2 className="text-sm font-medium tracking-tight text-foreground/90">
          {title}
        </h2>
        {typeof count === "number" ? (
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">{children}</div>
  );
}
