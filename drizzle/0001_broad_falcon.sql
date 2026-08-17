ALTER TABLE `attempt_record` ADD `idempotency_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `attempt_record_idempotency_key_unique` ON `attempt_record` (`idempotency_key`);