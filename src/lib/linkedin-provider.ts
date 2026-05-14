import "server-only";

// Provider-agnostic LinkedIn outreach layer. Today: OpenOutreach (OSS,
// runs Playwright + Sales Navigator as the user). Tomorrow: swap in
// HeyReach / Lemlist / etc. behind the same interface.

export type LinkedInProviderName = "openoutreach" | "none";

export interface LinkedInConversation {
  id: string;
  leadId: string | null;
  recipientName: string;
  recipientUrn: string | null;
  lastMessage: string | null;
  lastEventAt: Date;
  status: "sent" | "replied" | "accepted" | "ignored";
}

export interface LinkedInHealth {
  configured: boolean;
  reachable: boolean;
  paused: boolean;
  todayInvites: number;
  todayDms: number;
  todayProfileViews: number;
  dailyCaps: {
    invites: number;
    dms: number;
    profileViews: number;
  };
  workingHours: { start: string; end: string }; // "09:00" / "17:00"
  error: string | null;
  lastWarningAt: Date | null;
}

export interface LinkedInProvider {
  name: LinkedInProviderName;
  health(): Promise<LinkedInHealth>;
  listConversations(limit?: number): Promise<LinkedInConversation[]>;
}

import { openOutreachProvider } from "@/lib/providers/openoutreach";

const KNOWN_PROVIDERS: readonly LinkedInProviderName[] = ["openoutreach", "none"];
let warnedAboutUnknownProvider = false;

export function getLinkedInProvider(): LinkedInProvider {
  const raw = process.env.LINKEDIN_PROVIDER ?? "openoutreach";
  if (!(KNOWN_PROVIDERS as readonly string[]).includes(raw)) {
    if (!warnedAboutUnknownProvider) {
      // eslint-disable-next-line no-console
      console.warn(
        `[linkedin-provider] LINKEDIN_PROVIDER=${JSON.stringify(raw)} is not recognised. ` +
          `Falling back to disabled provider. Valid values: ${KNOWN_PROVIDERS.join(", ")}.`,
      );
      warnedAboutUnknownProvider = true;
    }
    return nullProvider;
  }
  const choice = raw as LinkedInProviderName;
  if (choice === "openoutreach") return openOutreachProvider;
  return nullProvider;
}

const nullProvider: LinkedInProvider = {
  name: "none",
  async health() {
    return {
      configured: false,
      reachable: false,
      paused: true,
      todayInvites: 0,
      todayDms: 0,
      todayProfileViews: 0,
      dailyCaps: { invites: 25, dms: 10, profileViews: 40 },
      workingHours: { start: "09:00", end: "17:00" },
      error: null,
      lastWarningAt: null,
    };
  },
  async listConversations() {
    return [];
  },
};
