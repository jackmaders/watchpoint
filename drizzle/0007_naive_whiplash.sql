PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attempt_record` (
	`created_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text,
	`input_value` text,
	`is_correct` integer NOT NULL,
	`is_timed_out` integer DEFAULT false NOT NULL,
	`playthrough_id` text,
	`response_time_ms` integer NOT NULL,
	`scenario_id` text,
	`scenario_snapshot_id` text,
	`selected_option_id` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`playthrough_id`) REFERENCES `playthrough`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenario`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`scenario_snapshot_id`) REFERENCES `scenario_snapshot`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_attempt_record`("created_at", "id", "idempotency_key", "input_value", "is_correct", "is_timed_out", "playthrough_id", "response_time_ms", "scenario_id", "scenario_snapshot_id", "selected_option_id", "user_id") SELECT "created_at", "id", "idempotency_key", "input_value", "is_correct", "is_timed_out", "playthrough_id", "response_time_ms", "scenario_id", "scenario_snapshot_id", "selected_option_id", "user_id" FROM `attempt_record`;--> statement-breakpoint
DROP TABLE `attempt_record`;--> statement-breakpoint
ALTER TABLE `__new_attempt_record` RENAME TO `attempt_record`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `attempt_record_idempotency_key_unique` ON `attempt_record` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `attempt_record_playthrough_idx` ON `attempt_record` (`playthrough_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `attempt_record_playthrough_snapshot_idx` ON `attempt_record` (`playthrough_id`,`scenario_snapshot_id`);--> statement-breakpoint
CREATE INDEX `attempt_record_user_idx` ON `attempt_record` (`user_id`,`created_at`);