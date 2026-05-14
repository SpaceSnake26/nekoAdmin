import "server-only";

import type {
  BroadcastInput,
  EmailContact,
  EmailProvider,
  ProviderStatus,
} from "@/lib/email-provider";
import {
  checkMauticConnection,
  getMauticConfig,
  upsertContact as upsertMauticContact,
} from "@/lib/mautic";

// Adapter around the existing `src/lib/mautic.ts` typed client so Mautic can
// remain selectable behind EMAIL_PROVIDER=mautic. We do not implement
// sendBroadcast here — Mautic broadcasts are authored inside Mautic itself,
// not pushed from the host app. The newsletter UI just shows ingest stats.

export const mauticProvider: EmailProvider = {
  name: "mautic",

  async checkConnection(): Promise<ProviderStatus> {
    const s = await checkMauticConnection();
    return {
      name: "mautic",
      configured: s.configured,
      reachable: s.reachable,
      contactCount: s.contactCount,
      error: s.error,
      baseUrl: s.baseUrl,
    };
  },

  async upsertContact(contact: EmailContact) {
    const cfg = getMauticConfig();
    if (!cfg) throw new Error("Mautic not configured");
    const c = await upsertMauticContact(cfg, contact);
    return { id: c.id };
  },

  async sendBroadcast(_input: BroadcastInput): Promise<{ id: string | number }> {
    throw new Error(
      "Mautic broadcasts must be authored inside Mautic. Use Listmonk for in-app sends.",
    );
  },
};
