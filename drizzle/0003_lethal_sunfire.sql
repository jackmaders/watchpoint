CREATE TABLE `audit_entry` (
	`action` text NOT NULL,
	`actor_user_id` text,
	`created_at` integer NOT NULL,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metadata` text NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_entry_actor_created_at_idx` ON `audit_entry` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_entry_entity_created_at_idx` ON `audit_entry` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `playthrough_module_selection` (
	`module_type` text NOT NULL,
	`playthrough_id` text NOT NULL,
	PRIMARY KEY(`playthrough_id`, `module_type`),
	FOREIGN KEY (`playthrough_id`) REFERENCES `playthrough`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `playthrough` (
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'IN_PROGRESS' NOT NULL,
	`user_id` text NOT NULL,
	`vod_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vod_id`) REFERENCES `vod`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playthrough_user_created_at_idx` ON `playthrough` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `playthrough_vod_idx` ON `playthrough` (`vod_id`);--> statement-breakpoint
CREATE TABLE `scenario_snapshot` (
	`explanation_text` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`image_url` text,
	`input_config` text NOT NULL,
	`input_type` text NOT NULL,
	`module_type` text NOT NULL,
	`playthrough_id` text NOT NULL,
	`position` integer NOT NULL,
	`prompt_text` text NOT NULL,
	`scenario_id` text NOT NULL,
	`time_limit_seconds` integer,
	`timestamp_seconds` real NOT NULL,
	FOREIGN KEY (`playthrough_id`) REFERENCES `playthrough`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scenario_snapshot_playthrough_position_idx` ON `scenario_snapshot` (`playthrough_id`,`position`);--> statement-breakpoint
CREATE INDEX `scenario_snapshot_playthrough_scenario_idx` ON `scenario_snapshot` (`playthrough_id`,`scenario_id`);--> statement-breakpoint
ALTER TABLE `attempt_record` ADD `playthrough_id` text REFERENCES playthrough(id);--> statement-breakpoint
ALTER TABLE `attempt_record` ADD `scenario_snapshot_id` text REFERENCES scenario_snapshot(id);--> statement-breakpoint
CREATE INDEX `attempt_record_playthrough_idx` ON `attempt_record` (`playthrough_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `attempt_record_user_idx` ON `attempt_record` (`user_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `user` ADD `is_test_account` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'PLAYER' NOT NULL;--> statement-breakpoint
CREATE INDEX `scenario_module_type_idx` ON `scenario` (`module_type`);--> statement-breakpoint
CREATE INDEX `scenario_vod_timestamp_idx` ON `scenario` (`vod_id`,`timestamp_seconds`);--> statement-breakpoint
CREATE INDEX `vod_published_created_at_idx` ON `vod` (`is_published`,`created_at`);