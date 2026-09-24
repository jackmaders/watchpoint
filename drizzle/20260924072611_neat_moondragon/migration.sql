PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_account` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_account`(`id`, `account_id`, `provider_id`, `user_id`, `access_token`, `refresh_token`, `id_token`, `access_token_expires_at`, `refresh_token_expires_at`, `scope`, `password`, `created_at`, `updated_at`) SELECT `id`, `account_id`, `provider_id`, `user_id`, `access_token`, `refresh_token`, `id_token`, `access_token_expires_at`, `refresh_token_expires_at`, `scope`, `password`, `created_at`, `updated_at` FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_session`(`id`, `expires_at`, `token`, `created_at`, `updated_at`, `ip_address`, `user_agent`, `user_id`) SELECT `id`, `expires_at`, `token`, `created_at`, `updated_at`, `ip_address`, `user_agent`, `user_id` FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lesson_answers` (
	`id` text PRIMARY KEY,
	`lesson_id` text NOT NULL,
	`question_id` text NOT NULL,
	`selected_option_id` text NOT NULL,
	`is_correct` integer NOT NULL,
	`time_spent_seconds` integer,
	`question_snapshot` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_lesson_answers_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_lesson_answers_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_lesson_answers_selected_option_id_options_id_fk` FOREIGN KEY (`selected_option_id`) REFERENCES `options`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
INSERT INTO `__new_lesson_answers`(`id`, `lesson_id`, `question_id`, `selected_option_id`, `is_correct`, `time_spent_seconds`, `question_snapshot`, `created_at`, `updated_at`) SELECT `id`, `lesson_id`, `question_id`, `selected_option_id`, `is_correct`, `time_spent_seconds`, `question_snapshot`, `created_at`, `updated_at` FROM `lesson_answers`;--> statement-breakpoint
DROP TABLE `lesson_answers`;--> statement-breakpoint
ALTER TABLE `__new_lesson_answers` RENAME TO `lesson_answers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `lesson_answers_lesson_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `lesson_selected_skills_lesson_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `options_question_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `questions_vod_id_idx`;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_answers_lesson_question_idx` ON `lesson_answers` (`lesson_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `lesson_answers_question_id_idx` ON `lesson_answers` (`question_id`);