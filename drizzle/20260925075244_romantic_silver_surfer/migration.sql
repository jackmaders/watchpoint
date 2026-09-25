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
	CONSTRAINT `fk_lesson_answers_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_lesson_answers`(`id`, `lesson_id`, `question_id`, `selected_option_id`, `is_correct`, `time_spent_seconds`, `question_snapshot`, `created_at`, `updated_at`) SELECT `id`, `lesson_id`, `question_id`, `selected_option_id`, `is_correct`, `time_spent_seconds`, `question_snapshot`, `created_at`, `updated_at` FROM `lesson_answers`;--> statement-breakpoint
DROP TABLE `lesson_answers`;--> statement-breakpoint
ALTER TABLE `__new_lesson_answers` RENAME TO `lesson_answers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_answers_lesson_question_idx` ON `lesson_answers` (`lesson_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `lesson_answers_question_id_idx` ON `lesson_answers` (`question_id`);