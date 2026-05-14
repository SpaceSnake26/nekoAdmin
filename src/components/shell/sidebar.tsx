import Link from "next/link";
import { and, eq, lt, sql } from "drizzle-orm";
import {
  Archive,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileText,
  GanttChart,
  Globe,
  Inbox,
  Kanban,
  Handshake,
  ListTodo,
  Mail,
  Megaphone,
  Send,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
  ExternalLink,
} from "lucide-react";

import { db, schema } from "@/server/db";

async function getNavCounts() {
  const now = new Date();
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      overdue: sql<number>`count(*) filter (where payment_status = 'open' and due_date < ${Math.floor(now.getTime() / 1000)})`,
      openTasks: sql<number>`count(*) filter (where task_status = 'open')`,
    })
    .from(schema.letters);
  const [{ groups }] = await db
    .select({ groups: sql<number>`count(*)` })
    .from(schema.letterGroups);
  const [{ senders }] = await db
    .select({ senders: sql<number>`count(*)` })
    .from(schema.senders);
  const [{ leads }] = await db
    .select({ leads: sql<number>`count(*)` })
    .from(schema.leads);
  const [{ kanban }] = await db
    .select({ kanban: sql<number>`count(*)` })
    .from(schema.kanbanCards);
  const [{ events }] = await db
    .select({
      events: sql<number>`count(*) filter (where starts_at >= ${Math.floor(now.getTime() / 1000)})`,
    })
    .from(schema.itEvents);
  const [{ linkedin }] = await db
    .select({
      linkedin: sql<number>`count(*) filter (where channel like 'linkedin-%' and direction = 'in' and replied_at is not null)`,
    })
    .from(schema.outreachMessages);
  return {
    inbox: stats.total,
    overdue: stats.overdue,
    tasks: stats.openTasks,
    groups,
    senders,
    leads,
    kanban,
    events,
    linkedin,
  };
}

export async function Sidebar() {
  const counts = await getNavCounts();

  const overview = [
    { href: "/", label: "Übersicht", icon: GanttChart, badge: null },
    {
      href: "/inbox",
      label: "Posteingang",
      icon: Inbox,
      badge: counts.inbox > 0 ? String(counts.inbox) : null,
    },
  ];
  const manage = [
    {
      href: "/groups",
      label: "Gruppen",
      icon: FileText,
      badge: counts.groups > 0 ? String(counts.groups) : null,
    },
    {
      href: "/tasks",
      label: "Aufgaben",
      icon: ListTodo,
      badge: counts.tasks > 0 ? String(counts.tasks) : null,
      accent: counts.tasks > 0,
    },
    {
      href: "/senders",
      label: "Absender",
      icon: Users,
      badge: counts.senders > 0 ? String(counts.senders) : null,
    },
  ];
  const procurement = [
    {
      href: "/kanban",
      label: "Kanban",
      icon: Kanban,
      badge: counts.kanban > 0 ? String(counts.kanban) : null,
    },
    {
      href: "/leads",
      label: "Leads",
      icon: Briefcase,
      badge: counts.leads > 0 ? String(counts.leads) : null,
    },
    {
      href: "/linkedin",
      label: "LinkedIn",
      icon: Handshake,
      badge: counts.linkedin > 0 ? String(counts.linkedin) : null,
      accent: counts.linkedin > 0,
    },
    { href: "/mailing", label: "Mailing", icon: Send, badge: null },
    { href: "/newsletter", label: "Newsletter", icon: Mail, badge: null },
    { href: "/simap", label: "Ausschreibungen", icon: Globe, badge: null },
  ];
  const market = [
    { href: "/social", label: "Social", icon: Megaphone, badge: null },
    {
      href: "/events",
      label: "Events",
      icon: CalendarDays,
      badge: counts.events > 0 ? String(counts.events) : null,
    },
    { href: "/surveys", label: "Umfragen", icon: ClipboardList, badge: null },
  ];
  const system = [
    {
      href: "/compliance",
      label: "Compliance",
      icon: ShieldCheck,
      badge: null,
    },
    { href: "/settings", label: "Einstellungen", icon: SettingsIcon, badge: null },
  ];

  return (
    <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Brand */}
      <div className="h-14 px-5 flex items-center gap-2 border-b border-sidebar-border">
        <div className="size-6 rounded-md bg-primary/15 flex items-center justify-center">
          <Archive className="size-3.5 text-primary" strokeWidth={2} />
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight">NekoAdmin</div>
          <div className="text-[10px] text-sidebar-foreground/55 uppercase tracking-wider">
            nekosys GmbH
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <NavSection label="Übersicht" items={overview} />
        {counts.overdue > 0 ? (
          <Link
            href="/inbox?pay=open&sort=dueDate&dir=asc"
            className="block rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 hover:bg-destructive/15 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-destructive">
                Überfällig
              </span>
              <span className="font-mono text-sm font-semibold text-destructive tabular-nums">
                {counts.overdue}
              </span>
            </div>
            <div className="text-[11px] text-sidebar-foreground/55 mt-0.5">
              Sofort fällig
            </div>
          </Link>
        ) : null}
        <NavSection label="Verwaltung" items={manage} />
        <NavSection label="Beschaffung" items={procurement} />
        <NavSection label="Markt" items={market} />
        <NavSection label="System" items={system} />
      </nav>

      <div className="px-5 py-3 border-t border-sidebar-border text-[10px] text-sidebar-foreground/40 font-mono uppercase tracking-wider">
        v0.1.0 · local
      </div>
    </aside>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge: string | null;
  accent?: boolean;
  external?: boolean;
}

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div>
      <div className="px-2 mb-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/65 font-semibold border-b border-sidebar-border/40 pb-1.5">
        {label}
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const linkClasses = "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors";
          const content = (
            <>
              <Icon
                className="size-4 text-sidebar-foreground/65 group-hover:text-sidebar-accent-foreground"
                strokeWidth={1.75}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.external ? (
                <ExternalLink className="size-3 text-sidebar-foreground/40" />
              ) : item.badge ? (
                <span
                  className={`font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded font-semibold ${
                    item.accent
                      ? "bg-primary/25 text-primary"
                      : "bg-sidebar-accent text-sidebar-accent-foreground/90"
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={item.href}>
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClasses}
                >
                  {content}
                </a>
              ) : (
                <Link href={item.href} className={linkClasses}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
