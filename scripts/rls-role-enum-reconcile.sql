ALTER TABLE `auditLogs` MODIFY COLUMN `role` enum('admin','hr','manager','employee') NOT NULL DEFAULT 'employee';
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','hr','manager','employee') NOT NULL DEFAULT 'employee';
