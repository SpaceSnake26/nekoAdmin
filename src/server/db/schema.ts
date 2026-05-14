import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const cuidColumn = () =>
  text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const timestamp = (name: string) => integer(name, { mode: "timestamp" });
const bool = (name: string) => integer(name, { mode: "boolean" });

export const senders = sqliteTable(
  "senders",
  {
    id: cuidColumn(),
    canonicalName: text("canonical_name").notNull(),
    aliases: text("aliases", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    uid: text("uid"),
    iban: text("iban"),
    defaultCategory: text("default_category"),
    defaultTags: text("default_tags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    trustLevel: text("trust_level").notNull().default("normal"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("senders_canonical_name_idx").on(table.canonicalName),
    index("senders_uid_idx").on(table.uid),
  ],
);

export const letterGroups = sqliteTable(
  "letter_groups",
  {
    id: cuidColumn(),
    senderId: text("sender_id").references(() => senders.id),
    reference: text("reference"),
    amount: real("amount"),
    currency: text("currency").default("CHF"),
    title: text("title").notNull(),
    status: text("status").notNull().default("open"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("letter_groups_sender_ref_idx").on(table.senderId, table.reference),
    index("letter_groups_status_idx").on(table.status),
  ],
);

export const letters = sqliteTable(
  "letters",
  {
    id: cuidColumn(),

    // Source / API raw (immutable after insert)
    source: text("source").notNull().default("epost-api"),
    epostId: text("epost_id"),
    epostTitle: text("epost_title"),
    epostFileName: text("epost_file_name"),
    epostDocTypes: text("epost_doc_types", { mode: "json" }).$type<string[]>(),
    apiSnapshot: text("api_snapshot", { mode: "json" }),

    // System computed (immutable after insert)
    pdfPath: text("pdf_path").notNull(),
    pdfHash: text("pdf_hash").notNull(),
    pageCount: integer("page_count"),
    receivedAt: timestamp("received_at").notNull(),
    ingestedAt: timestamp("ingested_at").notNull().$defaultFn(() => new Date()),

    // Extracted (overridable; protected fields tracked in userEditedFields)
    letterDate: timestamp("letter_date"),
    subject: text("subject"),
    senderRawName: text("sender_raw_name"),
    senderId: text("sender_id").references(() => senders.id),
    amount: real("amount"),
    currency: text("currency").default("CHF"),
    dueDate: timestamp("due_date"),
    reference: text("reference"),
    iban: text("iban"),
    qrIban: text("qr_iban"),
    // Primary classification (v2): 12 universal doc types
    documentType: text("document_type"),
    // Editable business area (FK to areas.code), nullable — e.g. Werbung hat keinen area
    area: text("area").references(() => areas.code, { onDelete: "set null" }),
    // Legacy category field (v1) — kept for backwards compat, will be dropped after migration
    category: text("category"),
    reminderLevel: integer("reminder_level").default(0),
    language: text("language"),
    containsMultipleSections: bool("contains_multiple_sections").default(false),
    recommendedAction: text("recommended_action"),
    summary: text("summary"),

    // User overrides — list of field names that the user has manually edited
    // Re-Extract MUST skip every field listed here.
    userEditedFields: text("user_edited_fields", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),

    // User-managed status
    paymentStatus: text("payment_status").notNull().default("none"),
    taskStatus: text("task_status").notNull().default("none"),
    paidAt: timestamp("paid_at"),
    doneAt: timestamp("done_at"),
    notes: text("notes"),

    // Grouping
    groupId: text("group_id").references(() => letterGroups.id),

    // Pipeline status & extraction audit
    status: text("status").notNull().default("raw"),
    extractionModel: text("extraction_model"),
    extractionConfidence: real("extraction_confidence"),
    extractionRawJson: text("extraction_raw_json", { mode: "json" }),
    extractionConflict: bool("extraction_conflict").default(false),
    extractionError: text("extraction_error"),

    // Concatenated searchable text (raw OCR + extracted fields), populated on extract
    searchText: text("search_text"),
  },
  (table) => [
    uniqueIndex("letters_pdf_hash_idx").on(table.pdfHash),
    uniqueIndex("letters_epost_id_idx").on(table.epostId),
    index("letters_received_at_idx").on(table.receivedAt),
    index("letters_due_date_idx").on(table.dueDate),
    index("letters_document_type_idx").on(table.documentType),
    index("letters_area_idx").on(table.area),
    index("letters_category_idx").on(table.category),
    index("letters_payment_status_idx").on(table.paymentStatus),
    index("letters_task_status_idx").on(table.taskStatus),
    index("letters_group_idx").on(table.groupId),
    index("letters_sender_ref_idx").on(table.senderId, table.reference),
    index("letters_status_idx").on(table.status),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: cuidColumn(),
    name: text("name").notNull(),
    color: text("color"),
    kind: text("kind").notNull().default("manual"),
  },
  (table) => [uniqueIndex("tags_name_idx").on(table.name)],
);

export const letterTags = sqliteTable(
  "letter_tags",
  {
    letterId: text("letter_id")
      .notNull()
      .references(() => letters.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.letterId, table.tagId] }),
    index("letter_tags_tag_idx").on(table.tagId),
  ],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: cuidColumn(),
    letterId: text("letter_id").references(() => letters.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    dueDate: timestamp("due_date"),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
    doneAt: timestamp("done_at"),
  },
  (table) => [
    index("tasks_due_status_idx").on(table.dueDate, table.status),
    index("tasks_letter_idx").on(table.letterId),
  ],
);

export const syncRuns = sqliteTable(
  "sync_runs",
  {
    id: cuidColumn(),
    source: text("source").notNull(),
    startedAt: timestamp("started_at").notNull().$defaultFn(() => new Date()),
    finishedAt: timestamp("finished_at"),
    status: text("status").notNull(),
    newLetters: integer("new_letters").notNull().default(0),
    extractedLetters: integer("extracted_letters").notNull().default(0),
    failedLetters: integer("failed_letters").notNull().default(0),
    errorMessage: text("error_message"),
  },
  (table) => [index("sync_runs_started_idx").on(table.startedAt)],
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

/**
 * Editable catalog of business areas ("Bereiche"). Seeded on first boot
 * with a sensible default list for Swiss SMEs; users can add, rename,
 * hide, and provide sender match patterns that feed the extraction prompt.
 */
export const areas = sqliteTable(
  "areas",
  {
    code: text("code").primaryKey(), // stable identifier, e.g. "ahv"
    label: text("label").notNull(), // display name, e.g. "AHV"
    color: text("color"), // tailwind hue hint
    senderPatterns: text("sender_patterns", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    description: text("description"),
    isHidden: bool("is_hidden").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("areas_sort_idx").on(table.sortOrder)],
);

export type Area = typeof areas.$inferSelect;
export type NewArea = typeof areas.$inferInsert;

// Type exports for use elsewhere
export type Letter = typeof letters.$inferSelect;
export type NewLetter = typeof letters.$inferInsert;
export type Sender = typeof senders.$inferSelect;
export type NewSender = typeof senders.$inferInsert;
export type LetterGroup = typeof letterGroups.$inferSelect;
export type NewLetterGroup = typeof letterGroups.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type SyncRun = typeof syncRuns.$inferSelect;
export type NewSyncRun = typeof syncRuns.$inferInsert;

/**
 * Fields on `letters` that the extraction pipeline writes to.
 * Re-Extract MUST skip any field listed in `letter.userEditedFields`.
 */
export const EXTRACTABLE_FIELDS = [
  "letterDate",
  "subject",
  "senderRawName",
  "amount",
  "currency",
  "dueDate",
  "reference",
  "iban",
  "qrIban",
  "documentType",
  "area",
  "reminderLevel",
  "language",
  "containsMultipleSections",
  "recommendedAction",
  "summary",
] as const;

export type ExtractableField = (typeof EXTRACTABLE_FIELDS)[number];

// ----- leads -----
export const leads = sqliteTable(
  "leads",
  {
    id: cuidColumn(),
    pharmacyName: text("pharmacy_name").notNull(),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    websiteUrl: text("website_url"),
    city: text("city"),
    hasWebshop: bool("has_webshop").default(false),
    shopUrl: text("shop_url"),
    hasAiProducts: bool("has_ai_products").default(false),
    hasAiChatbot: bool("has_ai_chatbot").default(false),
    notes: text("notes"),
    tags: text("tags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    // 'NEW' | 'CONTACTED' | 'REPLIED' | 'QUALIFIED' | 'WON' | 'LOST'
    status: text("status").notNull().default("NEW"),
    googlePlaceId: text("google_place_id"),
    // 'GMaps' | 'local.ch'
    source: text("source"),
    overallScore: real("overall_score"),
    categoryScores: text("category_scores", { mode: "json" }).$type<
      Record<string, number>
    >(),
    lastScanned: timestamp("last_scanned"),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("leads_status_idx").on(table.status),
    index("leads_email_idx").on(table.email),
    index("leads_city_idx").on(table.city),
  ],
);

// ----- surveys -----
export const surveys = sqliteTable("surveys", {
  id: cuidColumn(),
  title: text("title").notNull().default("Pharmacy IT Situation Survey"),
  introText: text("intro_text"),
  companyName: text("company_name"),
  companyContact: text("company_contact"),
  consentText: text("consent_text").default(
    "I agree to the privacy policy and terms.",
  ),
  createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
});

// ----- survey_responses -----
export const surveyResponses = sqliteTable(
  "survey_responses",
  {
    id: cuidColumn(),
    surveyId: text("survey_id").references(() => surveys.id, {
      onDelete: "set null",
    }),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),

    // Q1 Website
    hasWebsite: bool("has_website"),
    websiteSatisfaction: integer("website_satisfaction"), // 1..5 (validate in app)

    // Q2 Webshop: 'Yes' | 'No' | 'Planned'
    webshopStatus: text("webshop_status"),
    // Q3 IT mgmt: 'in-house' | 'agency' | 'freelancer' | 'not sure'
    itManagement: text("it_management"),
    // Q4 AI usage: 'None' | 'Internal' | 'Chatbot' | 'Both'
    aiUsage: text("ai_usage"),
    // Q5 Priority
    topPriority: text("top_priority"),
    topPriorityOther: text("top_priority_other"),

    contactName: text("contact_name"),
    email: text("email").notNull(),
    phone: text("phone"),
    consentAccepted: bool("consent_accepted").notNull().default(false),

    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("survey_responses_lead_idx").on(table.leadId),
    index("survey_responses_survey_idx").on(table.surveyId),
  ],
);

// ----- newsletter_signups -----
export const newsletterSignups = sqliteTable(
  "newsletter_signups",
  {
    id: cuidColumn(),
    email: text("email").notNull(),
    pharmacyName: text("pharmacy_name"),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    consentAccepted: bool("consent_accepted").notNull().default(false),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("newsletter_signups_email_idx").on(table.email)],
);

// ----- type exports -----
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type NewSurveyResponse = typeof surveyResponses.$inferInsert;
export type NewsletterSignup = typeof newsletterSignups.$inferSelect;
export type NewNewsletterSignup = typeof newsletterSignups.$inferInsert;

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "REPLIED",
  "QUALIFIED",
  "WON",
  "LOST",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// ----- it_events -----
// Curated IT/tech events for the regions the team is active in.
// `locationCode` is one of EVENT_LOCATIONS; `city` is free text for display.
export const itEvents = sqliteTable(
  "it_events",
  {
    id: cuidColumn(),
    title: text("title").notNull(),
    locationCode: text("location_code").notNull(),
    city: text("city"),
    venue: text("venue"),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at"),
    url: text("url"),
    description: text("description"),
    tags: text("tags", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("it_events_location_idx").on(table.locationCode),
    index("it_events_starts_at_idx").on(table.startsAt),
  ],
);

export const EVENT_LOCATIONS = [
  "bangkok",
  "hcmc",
  "danang",
  "zurich",
  "mittelland",
] as const;
export type EventLocation = (typeof EVENT_LOCATIONS)[number];

export const EVENT_LOCATION_LABELS: Record<EventLocation, string> = {
  bangkok: "Bangkok",
  hcmc: "Ho Chi Minh City",
  danang: "Da Nang",
  zurich: "Zürich",
  mittelland: "Mittelland (Olten–Aarau)",
};

export type ItEvent = typeof itEvents.$inferSelect;
export type NewItEvent = typeof itEvents.$inferInsert;

// ----- kanban -----
// Lightweight task board with cards that can reference leads/campaigns/events.
export const kanbanColumns = sqliteTable(
  "kanban_columns",
  {
    id: cuidColumn(),
    label: text("label").notNull(),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("kanban_columns_sort_idx").on(table.sortOrder)],
);

export const kanbanCards = sqliteTable(
  "kanban_cards",
  {
    id: cuidColumn(),
    columnId: text("column_id")
      .notNull()
      .references(() => kanbanColumns.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    // Soft links — null if not tied to a specific record.
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    eventId: text("event_id").references(() => itEvents.id, {
      onDelete: "set null",
    }),
    campaignTag: text("campaign_tag"),
    dueDate: timestamp("due_date"),
    assignee: text("assignee"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("kanban_cards_column_idx").on(table.columnId, table.sortOrder),
    index("kanban_cards_lead_idx").on(table.leadId),
    index("kanban_cards_due_idx").on(table.dueDate),
  ],
);

export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type NewKanbanColumn = typeof kanbanColumns.$inferInsert;
export type KanbanCard = typeof kanbanCards.$inferSelect;
export type NewKanbanCard = typeof kanbanCards.$inferInsert;

// ----- email_events (Mautic webhook ingest) -----
// Click / open / bounce / unsubscribe events streamed from Mautic via webhook.
// `mauticId` is the Mautic event ID for idempotency.
export const emailEvents = sqliteTable(
  "email_events",
  {
    id: cuidColumn(),
    mauticId: text("mautic_id"),
    eventType: text("event_type").notNull(), // 'send' | 'open' | 'click' | 'bounce' | 'unsubscribe'
    email: text("email").notNull(),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    campaignName: text("campaign_name"),
    emailName: text("email_name"),
    url: text("url"),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at").notNull(),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("email_events_mautic_id_idx").on(table.mauticId),
    index("email_events_type_idx").on(table.eventType),
    index("email_events_email_idx").on(table.email),
    index("email_events_lead_idx").on(table.leadId),
    index("email_events_occurred_idx").on(table.occurredAt),
  ],
);

export type EmailEvent = typeof emailEvents.$inferSelect;
export type NewEmailEvent = typeof emailEvents.$inferInsert;

// ----- consent_ledger -----
// Append-only audit of every opt-in / opt-out event. Required by UWG/DSG
// for any commercial communication. One row per state change.
export const CONSENT_KINDS = [
  "newsletter",
  "survey",
  "existing-customer",
  "linkedin-reply",
  "manual",
] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

export const LEGAL_BASES = [
  "UWG-opt-in",
  "existing-customer",
  "manual",
  "legitimate-interest",
] as const;
export type LegalBasis = (typeof LEGAL_BASES)[number];

export const consentLedger = sqliteTable(
  "consent_ledger",
  {
    id: cuidColumn(),
    email: text("email").notNull(),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    source: text("source").notNull(), // e.g. '/surveys/<id>', '/newsletter-form', 'manual:niklas'
    legalBasis: text("legal_basis").notNull(),
    acceptedAt: timestamp("accepted_at").notNull().$defaultFn(() => new Date()),
    revokedAt: timestamp("revoked_at"),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("consent_ledger_email_idx").on(table.email),
    index("consent_ledger_lead_idx").on(table.leadId),
    index("consent_ledger_kind_idx").on(table.kind),
    index("consent_ledger_revoked_idx").on(table.revokedAt),
  ],
);

export type ConsentLedgerRow = typeof consentLedger.$inferSelect;
export type NewConsentLedgerRow = typeof consentLedger.$inferInsert;

// ----- outreach_messages -----
// Every individual send across all 3 lanes (LinkedIn DM, email mass,
// email 1:1, postal). Both directions. Used for the LinkedIn inbox + audit.
export const OUTREACH_CHANNELS = [
  "linkedin-dm",
  "linkedin-invite",
  "email-mass",
  "email-1to1",
  "postal",
] as const;
export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number];

export const outreachMessages = sqliteTable(
  "outreach_messages",
  {
    id: cuidColumn(),
    channel: text("channel").notNull(),
    direction: text("direction").notNull(), // 'out' | 'in'
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    email: text("email"),
    linkedinUrn: text("linkedin_urn"),
    providerMessageId: text("provider_message_id"),
    subject: text("subject"),
    body: text("body"),
    status: text("status").notNull().default("sent"), // 'sent'|'delivered'|'read'|'replied'|'failed'
    sentAt: timestamp("sent_at").notNull().$defaultFn(() => new Date()),
    repliedAt: timestamp("replied_at"),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("outreach_provider_msg_idx").on(table.providerMessageId),
    index("outreach_channel_idx").on(table.channel),
    index("outreach_lead_idx").on(table.leadId),
    index("outreach_status_idx").on(table.status),
    index("outreach_sent_idx").on(table.sentAt),
  ],
);

export type OutreachMessage = typeof outreachMessages.$inferSelect;
export type NewOutreachMessage = typeof outreachMessages.$inferInsert;

// ----- social_posts -----
// Outbound content across LinkedIn / Instagram / TikTok / X / YouTube etc.
export const SOCIAL_PLATFORMS = [
  "linkedin",
  "instagram",
  "tiktok",
  "x",
  "youtube",
  "facebook",
  "threads",
  "bluesky",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_KINDS = ["post", "reel", "story", "short"] as const;
export type SocialKind = (typeof SOCIAL_KINDS)[number];

export const SOCIAL_STATUSES = [
  "draft",
  "scheduled",
  "posted",
  "failed",
] as const;
export type SocialStatus = (typeof SOCIAL_STATUSES)[number];

export const socialPosts = sqliteTable(
  "social_posts",
  {
    id: cuidColumn(),
    platforms: text("platforms", { mode: "json" })
      .$type<SocialPlatform[]>()
      .notNull()
      .default(sql`'[]'`),
    title: text("title"),
    body: text("body").notNull(),
    mediaUrls: text("media_urls", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    kind: text("kind").notNull().default("post"),
    status: text("status").notNull().default("draft"),
    scheduledFor: timestamp("scheduled_for"),
    postedAt: timestamp("posted_at"),
    providerPostIds: text("provider_post_ids", { mode: "json" }).$type<
      Record<string, string>
    >(),
    stats: text("stats", { mode: "json" }).$type<Record<string, number>>(),
    createdAt: timestamp("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("social_posts_status_idx").on(table.status),
    index("social_posts_scheduled_idx").on(table.scheduledFor),
  ],
);

export type SocialPost = typeof socialPosts.$inferSelect;
export type NewSocialPost = typeof socialPosts.$inferInsert;
