import "server-only";

import type {
  SocialDraft,
  SocialProvider,
  SocialProviderStatus,
  SocialResult,
} from "@/lib/social-provider";
import type { SocialPlatform } from "@/server/db/schema";

// Postiz (https://github.com/gitroomhq/postiz-app) self-hosted social
// posting. Postiz exposes a public REST API; the surface evolves quickly,
// so this adapter sticks to the well-documented endpoints and degrades
// gracefully if Postiz is unreachable.
//
// Required env:
//   POSTIZ_BASE_URL=https://postiz.nekosys.ch
//   POSTIZ_API_KEY=…  (created in Postiz → Settings → API Keys)

interface PostizConfig {
  baseUrl: string;
  apiKey: string;
}

function getConfig(): PostizConfig | null {
  const baseUrl = process.env.POSTIZ_BASE_URL;
  const apiKey = process.env.POSTIZ_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

async function postizFetch<T>(
  cfg: PostizConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Postiz ${res.status} ${res.statusText} ${path}: ${text.slice(0, 200)}`,
    );
  }
  return (await res.json()) as T;
}

interface PostizIntegrationsResponse {
  integrations: Array<{
    id: string;
    name: string; // 'linkedin' | 'instagram' | ...
    connected: boolean;
  }>;
}

interface PostizPublishResponse {
  posts: Array<{ id: string; integration: string }>;
}

const PLATFORM_MAP: Record<string, SocialPlatform> = {
  linkedin: "linkedin",
  instagram: "instagram",
  tiktok: "tiktok",
  x: "x",
  twitter: "x",
  youtube: "youtube",
  facebook: "facebook",
  threads: "threads",
  bluesky: "bluesky",
};

export const postizProvider: SocialProvider = {
  name: "postiz",

  async checkConnection(): Promise<SocialProviderStatus> {
    const cfg = getConfig();
    if (!cfg) {
      return {
        name: "postiz",
        configured: false,
        reachable: false,
        connectedPlatforms: [],
        error: null,
        baseUrl: null,
      };
    }
    try {
      const r = await postizFetch<PostizIntegrationsResponse>(
        cfg,
        "/api/integrations",
      );
      const connected = r.integrations
        .filter((i) => i.connected)
        .map((i) => PLATFORM_MAP[i.name.toLowerCase()])
        .filter((p): p is SocialPlatform => Boolean(p));
      return {
        name: "postiz",
        configured: true,
        reachable: true,
        connectedPlatforms: connected,
        error: null,
        baseUrl: cfg.baseUrl,
      };
    } catch (e) {
      return {
        name: "postiz",
        configured: true,
        reachable: false,
        connectedPlatforms: [],
        error: e instanceof Error ? e.message : String(e),
        baseUrl: cfg.baseUrl,
      };
    }
  },

  async publish(draft: SocialDraft): Promise<SocialResult> {
    const cfg = getConfig();
    if (!cfg) throw new Error("Postiz not configured");

    const body = {
      type: "now",
      shortLink: false,
      date: draft.scheduledFor
        ? draft.scheduledFor.toISOString()
        : new Date().toISOString(),
      posts: draft.platforms.map((platform) => ({
        integration: { id: platform },
        value: [
          {
            content: draft.body,
            image: draft.mediaUrls.map((url) => ({ url })),
          },
        ],
      })),
    };

    const r = await postizFetch<PostizPublishResponse>(cfg, "/api/posts", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const ids: Record<string, string> = {};
    for (const p of r.posts) ids[p.integration] = p.id;
    return { providerPostIds: ids };
  },
};
