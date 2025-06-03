CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`competition_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`max_photos_per_user` integer DEFAULT 3 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `categories_competition_idx` ON `categories` (`competition_id`);--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`voting_start_date` integer,
	`voting_end_date` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`max_photos_per_user` integer DEFAULT 5 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `competitions_status_idx` ON `competitions` (`status`);--> statement-breakpoint
CREATE INDEX `competitions_start_date_idx` ON `competitions` (`start_date`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`competition_id` text NOT NULL,
	`category_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`date_taken` integer NOT NULL,
	`location` text NOT NULL,
	`camera_info` text,
	`settings` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`rejection_reason` text,
	`approved_by` text,
	`approved_at` integer,
	`rejected_by` text,
	`rejected_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `photos_user_idx` ON `photos` (`user_id`);--> statement-breakpoint
CREATE INDEX `photos_competition_idx` ON `photos` (`competition_id`);--> statement-breakpoint
CREATE INDEX `photos_category_idx` ON `photos` (`category_id`);--> statement-breakpoint
CREATE INDEX `photos_status_idx` ON `photos` (`status`);--> statement-breakpoint
CREATE INDEX `photos_user_category_idx` ON `photos` (`user_id`,`category_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`photo_id` text NOT NULL,
	`reason` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_notes` text,
	`resolved_by` text,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reports_reporter_idx` ON `reports` (`reporter_id`);--> statement-breakpoint
CREATE INDEX `reports_photo_idx` ON `reports` (`photo_id`);--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`photo_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `votes_user_photo_idx` ON `votes` (`user_id`,`photo_id`);--> statement-breakpoint
CREATE INDEX `votes_photo_idx` ON `votes` (`photo_id`);--> statement-breakpoint
CREATE INDEX `votes_user_idx` ON `votes` (`user_id`);