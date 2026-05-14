import "server-only";

// Minimal typed client for a self-hosted Mautic instance.
// Auth: HTTP Basic with a Mautic user; or an OAuth2 personal access token.
// Docs: https://developer.mautic.org/

export interface MauticConfig {
  baseUrl: string; // e.g. https://mautic.nekosys.ch
  username: string;
  password: string;
  webhookSecret?: string;
}

export function getMauticConfig(): MauticConfig | null {
  const baseUrl = process.env.MAUTIC_BASE_URL;
  const username = process.env.MAUTIC_USERNAME;
  const password = process.env.MAUTIC_PASSWORD;
  if (!baseUrl || !username || !password) return null;
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    username,
    password,
    webhookSecret: process.env.MAUTIC_WEBHOOK_SECRET,
  };
}

export interface MauticContact {
  id: number;
  email: string;
  firstname: string | null;
  lastname: string | null;
  company: string | null;
  city: string | null;
  dateAdded: string;
}

export interface MauticEmailStats {
  id: number;
  name: string;
  subject: string;
  sentCount: number;
  readCount: number;
  // Mautic doesn't expose unique clicks on the email endpoint directly;
  // populated from /stats when available, else null.
  clickCount: number | null;
}

export interface MauticSegment {
  id: number;
  name: string;
  alias: string;
  contactCount: number;
}

interface ContactsListResponse {
  contacts: Record<string, RawMauticContact>;
  total: number;
}

interface RawMauticContact {
  id: number;
  fields?: { all?: Record<string, string | null> };
  dateAdded: string;
}

interface EmailsListResponse {
  emails: Record<string, RawMauticEmail>;
}

interface RawMauticEmail {
  id: number;
  name: string;
  subject: string;
  sentCount?: number;
  readCount?: number;
}

interface SegmentsListResponse {
  lists: Record<string, RawMauticSegment>;
}

interface RawMauticSegment {
  id: number;
  name: string;
  alias: string;
}

async function mauticFetch<T>(
  cfg: MauticConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const auth = Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mautic ${res.status} ${res.statusText} on ${path}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function listContacts(
  cfg: MauticConfig,
  opts: { search?: string; limit?: number } = {},
): Promise<{ items: MauticContact[]; total: number }> {
  const params = new URLSearchParams();
  if (opts.search) params.set("search", opts.search);
  params.set("limit", String(opts.limit ?? 25));
  const data = await mauticFetch<ContactsListResponse>(
    cfg,
    `/api/contacts?${params.toString()}`,
  );
  const items = Object.values(data.contacts).map((c) => {
    const f = c.fields?.all ?? {};
    return {
      id: c.id,
      email: f.email ?? "",
      firstname: f.firstname ?? null,
      lastname: f.lastname ?? null,
      company: f.company ?? null,
      city: f.city ?? null,
      dateAdded: c.dateAdded,
    };
  });
  return { items, total: data.total };
}

export async function upsertContact(
  cfg: MauticConfig,
  payload: {
    email: string;
    firstname?: string | null;
    lastname?: string | null;
    company?: string | null;
    city?: string | null;
    tags?: string[];
  },
): Promise<MauticContact> {
  // Mautic supports upsert via PATCH /api/contacts/new with a matching email.
  const data = await mauticFetch<{ contact: RawMauticContact }>(
    cfg,
    `/api/contacts/new`,
    {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        firstname: payload.firstname ?? undefined,
        lastname: payload.lastname ?? undefined,
        company: payload.company ?? undefined,
        city: payload.city ?? undefined,
        tags: payload.tags ?? undefined,
        overwriteWithBlank: false,
      }),
    },
  );
  const f = data.contact.fields?.all ?? {};
  return {
    id: data.contact.id,
    email: f.email ?? payload.email,
    firstname: f.firstname ?? null,
    lastname: f.lastname ?? null,
    company: f.company ?? null,
    city: f.city ?? null,
    dateAdded: data.contact.dateAdded,
  };
}

export async function listEmails(cfg: MauticConfig): Promise<MauticEmailStats[]> {
  const data = await mauticFetch<EmailsListResponse>(cfg, `/api/emails?limit=25`);
  return Object.values(data.emails).map((e) => ({
    id: e.id,
    name: e.name,
    subject: e.subject,
    sentCount: Number(e.sentCount ?? 0),
    readCount: Number(e.readCount ?? 0),
    clickCount: null,
  }));
}

export async function listSegments(
  cfg: MauticConfig,
): Promise<MauticSegment[]> {
  const data = await mauticFetch<SegmentsListResponse>(cfg, `/api/segments?limit=50`);
  return Object.values(data.lists).map((s) => ({
    id: s.id,
    name: s.name,
    alias: s.alias,
    contactCount: 0, // Mautic doesn't include count in list response.
  }));
}

export interface MauticConnectionStatus {
  configured: boolean;
  reachable: boolean;
  contactCount: number | null;
  error: string | null;
  baseUrl: string | null;
}

export async function checkMauticConnection(): Promise<MauticConnectionStatus> {
  const cfg = getMauticConfig();
  if (!cfg) {
    return {
      configured: false,
      reachable: false,
      contactCount: null,
      error: null,
      baseUrl: null,
    };
  }
  try {
    const { total } = await listContacts(cfg, { limit: 1 });
    return {
      configured: true,
      reachable: true,
      contactCount: total,
      error: null,
      baseUrl: cfg.baseUrl,
    };
  } catch (e) {
    return {
      configured: true,
      reachable: false,
      contactCount: null,
      error: e instanceof Error ? e.message : String(e),
      baseUrl: cfg.baseUrl,
    };
  }
}
