CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`price_jpy` integer NOT NULL,
	`quantity` integer NOT NULL,
	`width_cm` real NOT NULL,
	`depth_cm` real NOT NULL,
	`height_cm` real NOT NULL,
	`weight_kg` real NOT NULL,
	`condition` text NOT NULL,
	`venue` text NOT NULL,
	`address_area` text NOT NULL,
	`pickup_start` text NOT NULL,
	`pickup_end` text NOT NULL,
	`description` text NOT NULL,
	`transport` text NOT NULL,
	`disassembly` text NOT NULL,
	`image_url` text DEFAULT '' NOT NULL,
	`company_name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`reserved_request_id` text,
	`rights_confirmed_at` text NOT NULL,
	`terms_version` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `listings_status_deadline_idx` ON `listings` (`status`,`pickup_end`);--> statement-breakpoint
CREATE INDEX `listings_owner_idx` ON `listings` (`owner_id`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_length` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `photos_owner_idx` ON `photos` (`owner_id`);--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`buyer_email` text NOT NULL,
	`buyer_company` text NOT NULL,
	`message` text NOT NULL,
	`pickup_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`conditions_accepted_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `requests_listing_buyer_unique` ON `requests` (`listing_id`,`buyer_id`);--> statement-breakpoint
CREATE INDEX `requests_buyer_idx` ON `requests` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `requests_listing_idx` ON `requests` (`listing_id`);