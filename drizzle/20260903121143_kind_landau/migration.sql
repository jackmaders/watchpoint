PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session` (
	`createdAt` integer NOT NULL,
	`expiresAt` integer NOT NULL,
	`id` text PRIMARY KEY,
	`ipAddress` text,
	`token` text NOT NULL UNIQUE,
	`updatedAt` integer NOT NULL,
	`userAgent` text,
	`userId` text NOT NULL,
	CONSTRAINT `session_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_session`(`createdAt`, `expiresAt`, `id`, `ipAddress`, `token`, `updatedAt`, `userAgent`, `userId`) SELECT `createdAt`, `expiresAt`, `id`, `ipAddress`, `token`, `updatedAt`, `userAgent`, `userId` FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user` (
	`createdAt` integer NOT NULL,
	`email` text NOT NULL UNIQUE,
	`emailVerified` integer DEFAULT false NOT NULL,
	`id` text PRIMARY KEY,
	`image` text,
	`is_test_account` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'PLAYER' NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user`(`createdAt`, `email`, `emailVerified`, `id`, `image`, `is_test_account`, `name`, `role`, `updatedAt`) SELECT `createdAt`, `email`, `emailVerified`, `id`, `image`, `is_test_account`, `name`, `role`, `updatedAt` FROM `user`;--> statement-breakpoint
DROP TABLE `user`;--> statement-breakpoint
ALTER TABLE `__new_user` RENAME TO `user`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attempt_record` (
	`created_at` integer NOT NULL,
	`id` text PRIMARY KEY,
	`idempotency_key` text UNIQUE,
	`input_value` text,
	`is_correct` integer NOT NULL,
	`is_timed_out` integer DEFAULT false NOT NULL,
	`playthrough_id` text,
	`response_time_ms` integer NOT NULL,
	`scenario_id` text,
	`scenario_snapshot_id` text,
	`selected_option_id` text,
	`user_id` text NOT NULL,
	CONSTRAINT `attempt_record_playthrough_id_playthrough_id_fk` FOREIGN KEY (`playthrough_id`) REFERENCES `playthrough`(`id`) ON DELETE CASCADE,
	CONSTRAINT `attempt_record_scenario_id_scenario_id_fk` FOREIGN KEY (`scenario_id`) REFERENCES `scenario`(`id`) ON DELETE SET NULL,
	CONSTRAINT `attempt_record_scenario_snapshot_id_scenario_snapshot_id_fk` FOREIGN KEY (`scenario_snapshot_id`) REFERENCES `scenario_snapshot`(`id`) ON DELETE CASCADE,
	CONSTRAINT `attempt_record_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_attempt_record`(`created_at`, `id`, `idempotency_key`, `input_value`, `is_correct`, `is_timed_out`, `playthrough_id`, `response_time_ms`, `scenario_id`, `scenario_snapshot_id`, `selected_option_id`, `user_id`) SELECT `created_at`, `id`, `idempotency_key`, `input_value`, `is_correct`, `is_timed_out`, `playthrough_id`, `response_time_ms`, `scenario_id`, `scenario_snapshot_id`, `selected_option_id`, `user_id` FROM `attempt_record`;--> statement-breakpoint
DROP TABLE `attempt_record`;--> statement-breakpoint
ALTER TABLE `__new_attempt_record` RENAME TO `attempt_record`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_playthrough_completion` (
	`completed_at` integer NOT NULL,
	`id` text PRIMARY KEY,
	`playthrough_id` text NOT NULL UNIQUE,
	`user_id` text NOT NULL,
	CONSTRAINT `playthrough_completion_playthrough_id_playthrough_id_fk` FOREIGN KEY (`playthrough_id`) REFERENCES `playthrough`(`id`) ON DELETE CASCADE,
	CONSTRAINT `playthrough_completion_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_playthrough_completion`(`completed_at`, `id`, `playthrough_id`, `user_id`) SELECT `completed_at`, `id`, `playthrough_id`, `user_id` FROM `playthrough_completion`;--> statement-breakpoint
DROP TABLE `playthrough_completion`;--> statement-breakpoint
ALTER TABLE `__new_playthrough_completion` RENAME TO `playthrough_completion`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `session_token_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `user_email_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `attempt_record_idempotency_key_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `playthrough_completion_playthrough_id_unique`;--> statement-breakpoint
CREATE INDEX `attempt_record_playthrough_idx` ON `attempt_record` (`playthrough_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `attempt_record_playthrough_snapshot_idx` ON `attempt_record` (`playthrough_id`,`scenario_snapshot_id`);--> statement-breakpoint
CREATE INDEX `attempt_record_user_idx` ON `attempt_record` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `playthrough_completion_user_completed_at_idx` ON `playthrough_completion` (`user_id`,`completed_at`);