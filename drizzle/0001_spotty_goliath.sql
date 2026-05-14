CREATE TABLE `areas` (
	`code` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`color` text,
	`sender_patterns` text DEFAULT '[]' NOT NULL,
	`description` text,
	`is_hidden` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `areas_sort_idx` ON `areas` (`sort_order`);--> statement-breakpoint
ALTER TABLE `letters` ADD `document_type` text;--> statement-breakpoint
ALTER TABLE `letters` ADD `area` text REFERENCES areas(code);--> statement-breakpoint
CREATE INDEX `letters_document_type_idx` ON `letters` (`document_type`);--> statement-breakpoint
CREATE INDEX `letters_area_idx` ON `letters` (`area`);