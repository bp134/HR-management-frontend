CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`actorName` varchar(160) NOT NULL,
	`role` enum('admin','hr','manager') NOT NULL DEFAULT 'manager',
	`entityType` varchar(64) NOT NULL,
	`entityId` varchar(64) NOT NULL,
	`action` varchar(80) NOT NULL,
	`changedFields` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`contractType` enum('permanent','fixed_term','temporary','contractor') NOT NULL,
	`contractStatus` enum('draft','active','ending_soon','expired','superseded') NOT NULL DEFAULT 'draft',
	`salaryBasis` varchar(32) NOT NULL,
	`salaryAmount` int NOT NULL,
	`hoursPerWeek` int NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date,
	`probationEndDate` date,
	`reviewDate` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`code` varchar(32) NOT NULL,
	`managerName` varchar(160),
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `departments_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`documentCategory` enum('contract','id','visa','qualification') NOT NULL,
	`name` varchar(200) NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`expiryDate` date,
	`documentStatus` enum('valid','expiring','expired') NOT NULL DEFAULT 'valid',
	`uploadedBy` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uuid` varchar(64) NOT NULL,
	`employeeNumber` varchar(32) NOT NULL,
	`firstName` varchar(120) NOT NULL,
	`lastName` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`dateOfBirth` date NOT NULL,
	`niNumber` varchar(32) NOT NULL,
	`addressLine1` varchar(255) NOT NULL,
	`addressLine2` varchar(255),
	`city` varchar(120) NOT NULL,
	`postcode` varchar(32) NOT NULL,
	`departmentId` int NOT NULL,
	`managerId` int,
	`jobTitle` varchar(160) NOT NULL,
	`employmentStatus` enum('active','on_leave','probation','archived') NOT NULL DEFAULT 'active',
	`startDate` date NOT NULL,
	`archived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_uuid_unique` UNIQUE(`uuid`),
	CONSTRAINT `employees_employeeNumber_unique` UNIQUE(`employeeNumber`)
);
--> statement-breakpoint
CREATE TABLE `leaveBalances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`year` int NOT NULL,
	`annualDays` int NOT NULL,
	`usedDays` int NOT NULL DEFAULT 0,
	`pendingDays` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaveBalances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaveRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`approverId` int,
	`leaveType` enum('annual','sick','unpaid','other') NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`daysRequested` int NOT NULL,
	`notes` text,
	`leaveStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaveRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `professionalRegistrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeId` int NOT NULL,
	`bodyName` varchar(160) NOT NULL,
	`registrationNumber` varchar(64) NOT NULL,
	`annualExpiryDate` date NOT NULL,
	`reminderDays` int NOT NULL DEFAULT 30,
	`registrationStatus` enum('valid','expiring','expired') NOT NULL DEFAULT 'valid',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `professionalRegistrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','hr','manager') NOT NULL DEFAULT 'manager';