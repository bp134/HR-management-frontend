CREATE TABLE `complianceActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complianceEntityType` enum('contract','document','professional_registration','leave_request') NOT NULL,
	`entityId` int NOT NULL,
	`complianceWorkflowState` enum('open','reviewed','replacement_requested','renewal_in_progress','resolved') NOT NULL DEFAULT 'open',
	`note` text,
	`actorUserId` int NOT NULL,
	`actorName` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complianceActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reminderActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reminderType` enum('contract_expiry','document_expiry','registration_expiry','leave_approval') NOT NULL,
	`complianceEntityType` enum('contract','document','professional_registration','leave_request') NOT NULL,
	`entityId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reminderActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `auditLogs` MODIFY COLUMN `role` enum('admin','hr','manager','employee') NOT NULL DEFAULT 'employee';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','hr','manager','employee') NOT NULL DEFAULT 'employee';