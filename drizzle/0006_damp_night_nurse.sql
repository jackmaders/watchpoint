ALTER TABLE `vod` ADD `hero_name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `vod` ADD `role` text NOT NULL;--> statement-breakpoint
CREATE INDEX `vod_published_role_idx` ON `vod` (`is_published`,`role`);