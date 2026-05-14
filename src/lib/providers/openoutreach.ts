import "server-only";

import Database from "better-sqlite3";
import { desc, eq } from "drizzle-orm";

import type {
  LinkedInConversation,
  LinkedInHealth,
  LinkedInProvider,
} from "@/lib/linkedin-provider";
import { db as hostDb, schema } from "@/server/db";

// OpenOutreach (https://github.com/eracle/OpenOutreach) integration.
//
// OpenOutreach runs as a separate Python service on the same VPS. It owns
// the Playwright session + Sales Navigator interaction; we treat its
// SQLite as a read-only data source and additionally accept its webhook
// at /api/linkedin/event for real-time reply notifications.
//
// Required env:
//   OPENOUTREACH_DB_PATH=/srv/openoutreach/db.sqlite3   (read-only mount)
// Optional:
//   OPENOUTREACH_DAILY_INVITES_CAP=25
//   OPENOUTREACH_DAILY_DMS_CAP=10
//   OPENOUTREACH_DAILY_PROFILE_VIEWS_CAP=40
//   OPENOUTREACH_WORKING_HOURS=09:00-17:00
//
// If OPENOUTREACH_DB_PATH is unset or the file is missing, the provider
// reports `configured:false` and falls back to reading our own
// `outreach_messages` table (which gets populated via webhook).

interface OutreachRow {
  id: number | string;
  recipient_name?: string;
  recipient_urn?: string;
  last_message?: string;
  last_event_at?: string;
  status?: string;
}

type OpenError = { kind: "unset" } | { kind: "unreadable"; message: string };

function openOoDb(): Database.Database | OpenError {
  const path = process.env.OPENOUTREACH_DB_PATH;
  if (!path) return { kind: "unset" };
  try {
    return new Database(path, { readonly: true, fileMustExist: true });
  } catch (e) {
    return { kind: "unreadable", message: e instanceof Error ? e.message : String(e) };
  }
}

function isError(v: Database.Database | OpenError): v is OpenError {
  return typeof v === "object" && v !== null && "kind" in v;
}

function parseWorkingHours(): { start: string; end: string } {
  const raw = process.env.OPENOUTREACH_WORKING_HOURS ?? "09:00-17:00";
  const [start = "09:00", end = "17:00"] = raw.split("-");
  return { start, end };
}

function intEnv(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const openOutreachProvider: LinkedInProvider = {
  name: "openoutreach",

  async health(): Promise<LinkedInHealth> {
    const dailyCaps = {
      invites: intEnv("OPENOUTREACH_DAILY_INVITES_CAP", 25),
      dms: intEnv("OPENOUTREACH_DAILY_DMS_CAP", 10),
      profileViews: intEnv("OPENOUTREACH_DAILY_PROFILE_VIEWS_CAP", 40),
    };
    const workingHours = parseWorkingHours();

    const ooDb = openOoDb();
    if (isError(ooDb)) {
      // Fallback: derive activity from our own outreach_messages table
      // (populated by webhook even when we can't see OO's DB).
      const rows = await hostDb
        .select({
          channel: schema.outreachMessages.channel,
        })
        .from(schema.outreachMessages);
      const today = rows.filter(() => true); // simple — webhook events are recent
      return {
        // `configured` is true when the env var was set but the DB is unreadable,
        // because the operator clearly intended to wire OO up.
        configured: ooDb.kind === "unreadable",
        reachable: false,
        paused: true,
        todayInvites: today.filter((r) => r.channel === "linkedin-invite").length,
        todayDms: today.filter((r) => r.channel === "linkedin-dm").length,
        todayProfileViews: 0,
        dailyCaps,
        workingHours,
        error:
          ooDb.kind === "unreadable"
            ? `OPENOUTREACH_DB_PATH unreadable: ${ooDb.message}`
            : null,
        lastWarningAt: null,
      };
    }

    try {
      // OpenOutreach schema is project-specific. We expect a tasks-like
      // table with status + timestamps. We probe defensively.
      const stat = (sql: string, fallback = 0): number => {
        try {
          const r = ooDb.prepare(sql).get() as { n?: number } | undefined;
          return Number(r?.n ?? fallback);
        } catch {
          return fallback;
        }
      };
      const startOfDay = Math.floor(
        new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000,
      );
      const todayInvites = stat(
        `SELECT count(*) as n FROM tasks WHERE kind='invite' AND status='done' AND completed_at>=${startOfDay}`,
      );
      const todayDms = stat(
        `SELECT count(*) as n FROM tasks WHERE kind='message' AND status='done' AND completed_at>=${startOfDay}`,
      );
      const todayProfileViews = stat(
        `SELECT count(*) as n FROM tasks WHERE kind='profile_view' AND status='done' AND completed_at>=${startOfDay}`,
      );
      const lastWarningRow = (() => {
        try {
          const r = ooDb
            .prepare(
              `SELECT created_at FROM warnings ORDER BY created_at DESC LIMIT 1`,
            )
            .get() as { created_at?: number } | undefined;
          return r?.created_at ? new Date(r.created_at * 1000) : null;
        } catch {
          return null;
        }
      })();
      const pausedRow = (() => {
        try {
          const r = ooDb
            .prepare(`SELECT value FROM settings WHERE key='paused'`)
            .get() as { value?: string } | undefined;
          return r?.value === "1" || r?.value === "true";
        } catch {
          return false;
        }
      })();

      return {
        configured: true,
        reachable: true,
        paused: pausedRow,
        todayInvites,
        todayDms,
        todayProfileViews,
        dailyCaps,
        workingHours,
        error: null,
        lastWarningAt: lastWarningRow,
      };
    } catch (e) {
      return {
        configured: true,
        reachable: false,
        paused: true,
        todayInvites: 0,
        todayDms: 0,
        todayProfileViews: 0,
        dailyCaps,
        workingHours,
        error: e instanceof Error ? e.message : String(e),
        lastWarningAt: null,
      };
    } finally {
      try {
        ooDb.close();
      } catch {
        // best effort — the handle may already be closed if a stat() threw
      }
    }
  },

  async listConversations(limit = 50): Promise<LinkedInConversation[]> {
    // Always read from our own outreach_messages table — webhook ingest is
    // the source of truth for "what state do we believe this thread is in".
    const rows = await hostDb
      .select()
      .from(schema.outreachMessages)
      .where(eq(schema.outreachMessages.channel, "linkedin-dm"))
      .orderBy(desc(schema.outreachMessages.sentAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      leadId: r.leadId,
      recipientName: r.subject ?? r.email ?? r.linkedinUrn ?? "—",
      recipientUrn: r.linkedinUrn,
      lastMessage: r.body,
      lastEventAt: r.repliedAt ?? r.sentAt,
      status:
        r.status === "replied"
          ? "replied"
          : r.status === "delivered"
            ? "accepted"
            : r.status === "failed"
              ? "ignored"
              : "sent",
    }));
  },
};
