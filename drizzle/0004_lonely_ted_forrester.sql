CREATE TABLE `consent_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`lead_id` text,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`legal_basis` text NOT NULL,
	`accepted_at` integer NOT NULL,
	`revoked_at` integer,
	`payload` text,
	`ip` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `consent_ledger_email_idx` ON `consent_ledger` (`email`);--> statement-breakpoint
CREATE INDEX `consent_ledger_lead_idx` ON `consent_ledger` (`lead_id`);--> statement-breakpoint
CREATE INDEX `consent_ledger_kind_idx` ON `consent_ledger` (`kind`);--> statement-breakpoint
CREATE INDEX `consent_ledger_revoked_idx` ON `consent_ledger` (`revoked_at`);--> statement-breakpoint
CREATE TABLE `outreach_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`direction` text NOT NULL,
	`lead_id` text,
	`email` text,
	`linkedin_urn` text,
	`provider_message_id` text,
	`subject` text,
	`body` text,
	`status` text DEFAULT 'sent' NOT NULL,
	`sent_at` integer NOT NULL,
	`replied_at` integer,
	`payload` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outreach_provider_msg_idx` ON `outreach_messages` (`provider_message_id`);--> statement-breakpoint
CREATE INDEX `outreach_channel_idx` ON `outreach_messages` (`channel`);--> statement-breakpoint
CREATE INDEX `outreach_lead_idx` ON `outreach_messages` (`lead_id`);--> statement-breakpoint
CREATE INDEX `outreach_status_idx` ON `outreach_messages` (`status`);--> statement-breakpoint
CREATE INDEX `outreach_sent_idx` ON `outreach_messages` (`sent_at`);--> statement-breakpoint
CREATE TABLE `social_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`platforms` text DEFAULT '[]' NOT NULL,
	`title` text,
	`body` text NOT NULL,
	`media_urls` text DEFAULT '[]' NOT NULL,
	`kind` text DEFAULT 'post' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduled_for` integer,
	`posted_at` integer,
	`provider_post_ids` text,
	`stats` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `social_posts_status_idx` ON `social_posts` (`status`);--> statement-breakpoint
CREATE INDEX `social_posts_scheduled_idx` ON `social_posts` (`scheduled_for`);