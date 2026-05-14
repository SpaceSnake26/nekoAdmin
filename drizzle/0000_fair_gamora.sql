CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `letter_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text,
	`reference` text,
	`amount` real,
	`currency` text DEFAULT 'CHF',
	`title` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `senders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `letter_groups_sender_ref_idx` ON `letter_groups` (`sender_id`,`reference`);--> statement-breakpoint
CREATE INDEX `letter_groups_status_idx` ON `letter_groups` (`status`);--> statement-breakpoint
CREATE TABLE `letter_tags` (
	`letter_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`letter_id`, `tag_id`),
	FOREIGN KEY (`letter_id`) REFERENCES `letters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `letter_tags_tag_idx` ON `letter_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `letters` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text DEFAULT 'epost-api' NOT NULL,
	`epost_id` text,
	`epost_title` text,
	`epost_file_name` text,
	`epost_doc_types` text,
	`api_snapshot` text,
	`pdf_path` text NOT NULL,
	`pdf_hash` text NOT NULL,
	`page_count` integer,
	`received_at` integer NOT NULL,
	`ingested_at` integer NOT NULL,
	`letter_date` integer,
	`subject` text,
	`sender_raw_name` text,
	`sender_id` text,
	`amount` real,
	`currency` text DEFAULT 'CHF',
	`due_date` integer,
	`reference` text,
	`iban` text,
	`qr_iban` text,
	`category` text,
	`reminder_level` integer DEFAULT 0,
	`language` text,
	`contains_multiple_sections` integer DEFAULT false,
	`recommended_action` text,
	`summary` text,
	`user_edited_fields` text DEFAULT '[]' NOT NULL,
	`payment_status` text DEFAULT 'none' NOT NULL,
	`task_status` text DEFAULT 'none' NOT NULL,
	`paid_at` integer,
	`done_at` integer,
	`notes` text,
	`group_id` text,
	`status` text DEFAULT 'raw' NOT NULL,
	`extraction_model` text,
	`extraction_confidence` real,
	`extraction_raw_json` text,
	`extraction_conflict` integer DEFAULT false,
	`extraction_error` text,
	`search_text` text,
	FOREIGN KEY (`sender_id`) REFERENCES `senders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_id`) REFERENCES `letter_groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `letters_pdf_hash_idx` ON `letters` (`pdf_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `letters_epost_id_idx` ON `letters` (`epost_id`);--> statement-breakpoint
CREATE INDEX `letters_received_at_idx` ON `letters` (`received_at`);--> statement-breakpoint
CREATE INDEX `letters_due_date_idx` ON `letters` (`due_date`);--> statement-breakpoint
CREATE INDEX `letters_category_idx` ON `letters` (`category`);--> statement-breakpoint
CREATE INDEX `letters_payment_status_idx` ON `letters` (`payment_status`);--> statement-breakpoint
CREATE INDEX `letters_task_status_idx` ON `letters` (`task_status`);--> statement-breakpoint
CREATE INDEX `letters_group_idx` ON `letters` (`group_id`);--> statement-breakpoint
CREATE INDEX `letters_sender_ref_idx` ON `letters` (`sender_id`,`reference`);--> statement-breakpoint
CREATE INDEX `letters_status_idx` ON `letters` (`status`);--> statement-breakpoint
CREATE TABLE `senders` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_name` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`uid` text,
	`iban` text,
	`default_category` text,
	`default_tags` text DEFAULT '[]' NOT NULL,
	`trust_level` text DEFAULT 'normal' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `senders_canonical_name_idx` ON `senders` (`canonical_name`);--> statement-breakpoint
CREATE INDEX `senders_uid_idx` ON `senders` (`uid`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text NOT NULL,
	`new_letters` integer DEFAULT 0 NOT NULL,
	`extracted_letters` integer DEFAULT 0 NOT NULL,
	`failed_letters` integer DEFAULT 0 NOT NULL,
	`error_message` text
);
--> statement-breakpoint
CREATE INDEX `sync_runs_started_idx` ON `sync_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`kind` text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_idx` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`letter_id` text,
	`title` text NOT NULL,
	`due_date` integer,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`done_at` integer,
	FOREIGN KEY (`letter_id`) REFERENCES `letters`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_due_status_idx` ON `tasks` (`due_date`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_letter_idx` ON `tasks` (`letter_id`);