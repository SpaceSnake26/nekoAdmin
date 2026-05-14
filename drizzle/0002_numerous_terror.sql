CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`pharmacy_name` text NOT NULL,
	`contact_name` text,
	`email` text,
	`phone` text,
	`website_url` text,
	`city` text,
	`has_webshop` integer DEFAULT false,
	`shop_url` text,
	`has_ai_products` integer DEFAULT false,
	`has_ai_chatbot` integer DEFAULT false,
	`notes` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'NEW' NOT NULL,
	`google_place_id` text,
	`source` text,
	`overall_score` real,
	`category_scores` text,
	`last_scanned` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leads_status_idx` ON `leads` (`status`);--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);--> statement-breakpoint
CREATE INDEX `leads_city_idx` ON `leads` (`city`);--> statement-breakpoint
CREATE TABLE `newsletter_signups` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`pharmacy_name` text,
	`lead_id` text,
	`consent_accepted` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_signups_email_idx` ON `newsletter_signups` (`email`);--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`survey_id` text,
	`lead_id` text,
	`has_website` integer,
	`website_satisfaction` integer,
	`webshop_status` text,
	`it_management` text,
	`ai_usage` text,
	`top_priority` text,
	`top_priority_other` text,
	`contact_name` text,
	`email` text NOT NULL,
	`phone` text,
	`consent_accepted` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `survey_responses_lead_idx` ON `survey_responses` (`lead_id`);--> statement-breakpoint
CREATE INDEX `survey_responses_survey_idx` ON `survey_responses` (`survey_id`);--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT 'Pharmacy IT Situation Survey' NOT NULL,
	`intro_text` text,
	`company_name` text,
	`company_contact` text,
	`consent_text` text DEFAULT 'I agree to the privacy policy and terms.',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
