"use server";

// Legacy aliases — the implementation moved to email-actions.ts when we
// added the provider-agnostic abstraction. Kept for any caller that still
// imports the Mautic-specific names; new code should import directly from
// `@/server/actions/email-actions`.

export {
  syncLeadsToEmailProvider as syncLeadsToMautic,
  refreshEmailProviderStatus as refreshMauticStatus,
} from "@/server/actions/email-actions";
export type { SyncLeadsResult } from "@/server/actions/email-actions";
