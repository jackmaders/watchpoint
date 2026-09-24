CREATE TABLE `lesson_answers` (
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
CREATE TABLE `lesson_selected_skills` (
	`lesson_id` text NOT NULL,
	`skill_id` text NOT NULL,
	CONSTRAINT `lesson_selected_skills_pk` PRIMARY KEY(`lesson_id`, `skill_id`),
	CONSTRAINT `fk_lesson_selected_skills_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_lesson_selected_skills_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`vod_id` text NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_lessons_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_lessons_vod_id_vods_id_fk` FOREIGN KEY (`vod_id`) REFERENCES `vods`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `options` (
	`id` text PRIMARY KEY,
	`question_id` text NOT NULL,
	`text` text NOT NULL,
	`is_correct` integer DEFAULT false NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_options_question_id_questions_id_fk` FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY,
	`vod_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`timestamp_seconds` integer NOT NULL,
	`prompt` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_questions_vod_id_vods_id_fk` FOREIGN KEY (`vod_id`) REFERENCES `vods`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_questions_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vods` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`youtube_id` text NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
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
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_answers_lesson_question_idx` ON `lesson_answers` (`lesson_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `lesson_answers_question_id_idx` ON `lesson_answers` (`question_id`);--> statement-breakpoint
CREATE INDEX `lesson_selected_skills_skill_id_idx` ON `lesson_selected_skills` (`skill_id`);--> statement-breakpoint
CREATE INDEX `lessons_user_id_idx` ON `lessons` (`user_id`);--> statement-breakpoint
CREATE INDEX `lessons_vod_id_idx` ON `lessons` (`vod_id`);--> statement-breakpoint
CREATE INDEX `options_question_order_idx` ON `options` (`question_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `questions_skill_id_idx` ON `questions` (`skill_id`);--> statement-breakpoint
CREATE INDEX `questions_vod_timestamp_idx` ON `questions` (`vod_id`,`timestamp_seconds`);--> statement-breakpoint
CREATE UNIQUE INDEX `vods_is_demo_unique` ON `vods` (`is_demo`) WHERE "vods"."is_demo" = 1;--> statement-breakpoint
CREATE INDEX `vods_youtube_id_idx` ON `vods` (`youtube_id`);