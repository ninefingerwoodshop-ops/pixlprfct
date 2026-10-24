CREATE TABLE `document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`label` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `versions_document_created` ON `document_versions` (`document_id`,`created_at`,`id`);