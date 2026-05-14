import "server-only";

import type { SocialPlatform } from "@/server/db/schema";

export type SocialProviderName = "postiz" | "none";

export interface SocialDraft {
  platforms: SocialPlatform[];
  title?: string | null;
  body: string;
  mediaUrls: string[];
  kind: "post" | "reel" | "story" | "short";
  scheduledFor?: Date | null;
}

export interface SocialResult {
  providerPostIds: Record<string, string>; // platform → provider's ID
}

export interface SocialProviderStatus {
  name: SocialProviderName;
  configured: boolean;
  reachable: boolean;
  connectedPlatforms: SocialPlatform[];
  error: string | null;
  baseUrl: string | null;
}

export interface SocialProvider {
  name: SocialProviderName;
  checkConnection(): Promise<SocialProviderStatus>;
  publish(draft: SocialDraft): Promise<SocialResult>;
}

import { postizProvider } from "@/lib/providers/postiz";

export function getSocialProvider(): SocialProvider {
  const choice = (process.env.SOCIAL_PROVIDER ?? "postiz") as SocialProviderName;
  if (choice === "postiz") return postizProvider;
  return nullProvider;
}

const nullProvider: SocialProvider = {
  name: "none",
  async checkConnection() {
    return {
      name: "none",
      configured: false,
      reachable: false,
      connectedPlatforms: [],
      error: null,
      baseUrl: null,
    };
  },
  async publish() {
    throw new Error("SOCIAL_PROVIDER is not configured");
  },
};
