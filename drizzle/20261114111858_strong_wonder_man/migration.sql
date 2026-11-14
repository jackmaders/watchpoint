CREATE TABLE `checkpoints` (
	`correct_option_index` integer NOT NULL,
	`explanation` text NOT NULL,
	`id` text PRIMARY KEY,
	`options` text NOT NULL,
	`question` text NOT NULL,
	`skill_category` text NOT NULL,
	`time_sec` integer NOT NULL,
	`vod_id` text NOT NULL,
	CONSTRAINT `fk_checkpoints_vod_id_vods_id_fk` FOREIGN KEY (`vod_id`) REFERENCES `vods`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `vods` (
	`created_at` integer NOT NULL,
	`curated_order` integer NOT NULL,
	`hero` text NOT NULL,
	`id` text PRIMARY KEY,
	`map` text NOT NULL,
	`tier` text NOT NULL,
	`title` text NOT NULL,
	`youtube_video_id` text NOT NULL
);
--> statement-breakpoint
DROP INDEX IF EXISTS `todos_user_id_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `todos_user_id_title_unique`;--> statement-breakpoint
CREATE INDEX `checkpoints_vod_id_time_sec_idx` ON `checkpoints` (`vod_id`,`time_sec`);--> statement-breakpoint
CREATE INDEX `vods_curated_order_idx` ON `vods` (`curated_order`);--> statement-breakpoint
DROP TABLE `todos`;