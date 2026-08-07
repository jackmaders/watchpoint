CREATE TABLE `account` (
	`accessToken` text,
	`accessTokenExpiresAt` integer,
	`accountId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`idToken` text,
	`password` text,
	`providerId` text NOT NULL,
	`refreshToken` text,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`updatedAt` integer NOT NULL,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `attempt_record` (
	`created_at` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`input_value` text,
	`is_correct` integer NOT NULL,
	`response_time_ms` integer NOT NULL,
	`scenario_id` text NOT NULL,
	`selected_option_id` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`scenario_id`) REFERENCES `scenario`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scenario` (
	`explanation_text` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`image_url` text,
	`input_config` text NOT NULL,
	`input_type` text NOT NULL,
	`module_type` text NOT NULL,
	`prompt_text` text NOT NULL,
	`time_limit_seconds` integer,
	`timestamp_seconds` real NOT NULL,
	`vod_id` text NOT NULL,
	FOREIGN KEY (`vod_id`) REFERENCES `vod`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`createdAt` integer NOT NULL,
	`expiresAt` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`ipAddress` text,
	`token` text NOT NULL,
	`updatedAt` integer NOT NULL,
	`userAgent` text,
	`userId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`createdAt` integer NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`image` text,
	`name` text NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`createdAt` integer,
	`expiresAt` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`updatedAt` integer,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vod` (
	`created_at` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`map_name` text NOT NULL,
	`rank_tier` text NOT NULL,
	`title` text NOT NULL,
	`youtube_video_id` text NOT NULL
);
