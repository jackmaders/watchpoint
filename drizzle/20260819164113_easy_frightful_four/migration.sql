CREATE TABLE `playthrough_completion` (
	`completed_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`playthrough_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`playthrough_id`) REFERENCES `playthrough`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playthrough_completion_playthrough_id_unique` ON `playthrough_completion` (`playthrough_id`);--> statement-breakpoint
CREATE INDEX `playthrough_completion_user_completed_at_idx` ON `playthrough_completion` (`user_id`,`completed_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `attempt_record_playthrough_snapshot_idx` ON `attempt_record` (`playthrough_id`,`scenario_snapshot_id`);