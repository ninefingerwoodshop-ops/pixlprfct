ALTER TABLE `documents` ADD `created_by` text;
--> statement-breakpoint
UPDATE `documents` SET `created_by` = `owner`;
