import "server-only";

import type {
  BroadcastInput,
  EmailContact,
  EmailProvider,
  ProviderStatus,
} from "@/lib/email-provider";

// Listmonk REST API client.
// Docs: https://listmonk.app/docs/apis/apis/
//
// Required env:
//   LISTMONK_BASE_URL=https://newsletter.nekosys.ch
//   LISTMONK_USERNAME=api
//   LISTMONK_PASSWORD=••••
//
// Optional:
//   LISTMONK_DEFAULT_LIST_ID=1   // numeric ID of the default subscribers list
//   LISTMONK_WEBHOOK_SECRET=…    // matched in /api/listmonk/webhook

interface ListmonkConfig {
  baseUrl: string;
  username: string;
  password: string;
  defaultListId: number | null;
}

function getConfig(): ListmonkConfig | null {
  const baseUrl = process.env.LISTMONK_BASE_URL;
  const username = process.env.LISTMONK_USERNAME;
  const password = process.env.LISTMONK_PASSWORD;
  if (!baseUrl || !username || !password) return null;
  const listId = process.env.LISTMONK_DEFAULT_LIST_ID;
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    username,
    password,
    defaultListId: listId ? Number(listId) : null,
  };
}

async function listmonkFetch<T>(
  cfg: ListmonkConfig,
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
    throw new Error(
      `Listmonk ${res.status} ${res.statusText} ${path}: ${text.slice(0, 200)}`,
    );
  }
  return (await res.json()) as T;
}

interface ListmonkSubscribersResponse {
  data: {
    total: number;
    results: Array<{ id: number; email: string }>;
  };
}

interface ListmonkSubscriberPostResponse {
  data: { id: number; email: string };
}

interface ListmonkCampaignPostResponse {
  data: { id: number; uuid: string };
}

export const listmonkProvider: EmailProvider = {
  name: "listmonk",

  async checkConnection(): Promise<ProviderStatus> {
    const cfg = getConfig();
    if (!cfg) {
      return {
        name: "listmonk",
        configured: false,
        reachable: false,
        contactCount: null,
        error: null,
        baseUrl: null,
      };
    }
    try {
      const r = await listmonkFetch<ListmonkSubscribersResponse>(
        cfg,
        "/api/subscribers?per_page=1",
      );
      return {
        name: "listmonk",
        configured: true,
        reachable: true,
        contactCount: r.data.total,
        error: null,
        baseUrl: cfg.baseUrl,
      };
    } catch (e) {
      return {
        name: "listmonk",
        configured: true,
        reachable: false,
        contactCount: null,
        error: e instanceof Error ? e.message : String(e),
        baseUrl: cfg.baseUrl,
      };
    }
  },

  async upsertContact(contact: EmailContact) {
    const cfg = getConfig();
    if (!cfg) throw new Error("Listmonk not configured");

    const name = [contact.firstname, contact.lastname]
      .filter(Boolean)
      .join(" ")
      .trim();
    const body = {
      email: contact.email,
      name: name || contact.email,
      status: "enabled",
      lists: cfg.defaultListId ? [cfg.defaultListId] : [],
      preconfirm_subscriptions: true,
      attribs: {
        company: contact.company ?? undefined,
        city: contact.city ?? undefined,
        tags: contact.tags ?? undefined,
      },
    };

    try {
      const r = await listmonkFetch<ListmonkSubscriberPostResponse>(
        cfg,
        "/api/subscribers",
        { method: "POST", body: JSON.stringify(body) },
      );
      return { id: r.data.id };
    } catch (e) {
      // Listmonk returns 409 on duplicate — treat as a soft success.
      // We can't update attribs from here without the existing id;
      // a future sync job can reconcile attribs.
      if (e instanceof Error && /409|duplicate|already/i.test(e.message)) {
        return { id: contact.email };
      }
      throw e;
    }
  },

  async sendBroadcast(input: BroadcastInput) {
    const cfg = getConfig();
    if (!cfg) throw new Error("Listmonk not configured");

    const lists: number[] = [];
    if (input.listAlias && /^\d+$/.test(input.listAlias)) {
      lists.push(Number(input.listAlias));
    } else if (cfg.defaultListId) {
      lists.push(cfg.defaultListId);
    }
    if (lists.length === 0)
      throw new Error("Listmonk: no list selected (set LISTMONK_DEFAULT_LIST_ID)");

    const body = {
      name: input.subject,
      subject: input.subject,
      lists,
      from_email: process.env.EMAIL_FROM ?? "noreply@nekosys.ch",
      content_type: "html",
      body: input.bodyHtml,
      altbody: input.bodyText,
      type: "regular",
    };
    const r = await listmonkFetch<ListmonkCampaignPostResponse>(
      cfg,
      "/api/campaigns",
      { method: "POST", body: JSON.stringify(body) },
    );
    // Start the campaign immediately.
    await listmonkFetch<unknown>(cfg, `/api/campaigns/${r.data.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: "running" }),
    });
    return { id: r.data.id };
  },
};
