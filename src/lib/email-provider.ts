import "server-only";

// Provider-agnostic email layer. Adapters under src/lib/providers/* implement
// the EmailProvider interface; the active one is chosen by EMAIL_PROVIDER env.

export type EmailProviderName = "listmonk" | "mautic" | "none";

export interface EmailContact {
  email: string;
  firstname?: string | null;
  lastname?: string | null;
  company?: string | null;
  city?: string | null;
  tags?: string[];
}

export interface BroadcastInput {
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  listAlias?: string; // provider-side list/segment identifier
  recipients?: string[]; // when sending to an explicit list of emails
}

export interface ProviderStatus {
  name: EmailProviderName;
  configured: boolean;
  reachable: boolean;
  contactCount: number | null;
  error: string | null;
  baseUrl: string | null;
}

export interface EmailProvider {
  name: EmailProviderName;
  checkConnection(): Promise<ProviderStatus>;
  upsertContact(contact: EmailContact): Promise<{ id: string | number }>;
  sendBroadcast(input: BroadcastInput): Promise<{ id: string | number }>;
}

// ---------------------------------------------------------------------------

import { mauticProvider } from "@/lib/providers/mautic-adapter";
import { listmonkProvider } from "@/lib/providers/listmonk";

export function getEmailProvider(): EmailProvider {
  const choice = (process.env.EMAIL_PROVIDER ??
    "listmonk") as EmailProviderName;
  if (choice === "mautic") return mauticProvider;
  if (choice === "listmonk") return listmonkProvider;
  return nullProvider;
}

const nullProvider: EmailProvider = {
  name: "none",
  async checkConnection() {
    return {
      name: "none",
      configured: false,
      reachable: false,
      contactCount: null,
      error: null,
      baseUrl: null,
    };
  },
  async upsertContact() {
    throw new Error("EMAIL_PROVIDER is not configured");
  },
  async sendBroadcast() {
    throw new Error("EMAIL_PROVIDER is not configured");
  },
};
