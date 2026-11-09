CREATE TABLE `document_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`bytes` integer NOT NULL,
	`touched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `storage_maintenance` (
	`id` text PRIMARY KEY NOT NULL,
	`next_run` integer NOT NULL,
	`cursor` text
);
--> statement-breakpoint
ALTER TABLE `document_versions` ADD `body_bytes` integer;--> statement-breakpoint
CREATE INDEX `versions_owner` ON `document_versions` (`owner`);--> statement-breakpoint
ALTER TABLE `documents` ADD `body_bytes` integer;--> statement-breakpoint
UPDATE `documents` SET `body_bytes` = length(CAST(`body` AS BLOB)) WHERE `body_bytes` IS NULL;--> statement-breakpoint
UPDATE `document_versions` SET `body_bytes` = length(CAST(`body` AS BLOB)) WHERE `body_bytes` IS NULL;--> statement-breakpoint
INSERT INTO `storage_maintenance` (`id`, `next_run`, `cursor`) VALUES ('objects', 0, NULL);
