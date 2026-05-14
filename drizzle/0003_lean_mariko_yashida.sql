CREATE TABLE `email_events` (
	`id` text PRIMARY KEY NOT NULL,
	`mautic_id` text,
	`event_type` text NOT NULL,
	`email` text NOT NULL,
	`lead_id` text,
	`campaign_name` text,
	`email_name` text,
	`url` text,
	`payload` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_events_mautic_id_idx` ON `email_events` (`mautic_id`);--> statement-breakpoint
CREATE INDEX `email_events_type_idx` ON `email_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `email_events_email_idx` ON `email_events` (`email`);--> statement-breakpoint
CREATE INDEX `email_events_lead_idx` ON `email_events` (`lead_id`);--> statement-breakpoint
CREATE INDEX `email_events_occurred_idx` ON `email_events` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `it_events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`location_code` text NOT NULL,
	`city` text,
	`venue` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`url` text,
	`description` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `it_events_location_idx` ON `it_events` (`location_code`);--> statement-breakpoint
CREATE INDEX `it_events_starts_at_idx` ON `it_events` (`starts_at`);--> statement-breakpoint
CREATE TABLE `kanban_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`column_id` text NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`lead_id` text,
	`event_id` text,
	`campaign_tag` text,
	`due_date` integer,
	`assignee` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`column_id`) REFERENCES `kanban_columns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_id`) REFERENCES `it_events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `kanban_cards_column_idx` ON `kanban_cards` (`column_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `kanban_cards_lead_idx` ON `kanban_cards` (`lead_id`);--> statement-breakpoint
CREATE INDEX `kanban_cards_due_idx` ON `kanban_cards` (`due_date`);--> statement-breakpoint
CREATE TABLE `kanban_columns` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`color` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `kanban_columns_sort_idx` ON `kanban_columns` (`sort_order`);