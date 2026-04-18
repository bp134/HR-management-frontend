import {
  boolean,
  date,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const appRoleEnum = mysqlEnum("role", ["admin", "hr", "manager", "employee"]);
export const employeeStatusEnum = mysqlEnum("employmentStatus", [
  "active",
  "on_leave",
  "probation",
  "archived",
]);
export const contractTypeEnum = mysqlEnum("contractType", [
  "permanent",
  "fixed_term",
  "temporary",
  "contractor",
]);
export const contractStatusEnum = mysqlEnum("contractStatus", [
  "draft",
  "active",
  "ending_soon",
  "expired",
  "superseded",
]);
export const documentCategoryEnum = mysqlEnum("documentCategory", [
  "contract",
  "id",
  "visa",
  "qualification",
  "professional_registration",
]);
export const documentStatusEnum = mysqlEnum("documentStatus", [
  "valid",
  "expiring",
  "expired",
]);
export const leaveTypeEnum = mysqlEnum("leaveType", [
  "annual",
  "sick",
  "unpaid",
  "other",
]);
export const leaveStatusEnum = mysqlEnum("leaveStatus", [
  "pending",
  "approved",
  "rejected",
]);
export const registrationStatusEnum = mysqlEnum("registrationStatus", [
  "valid",
  "expiring",
  "expired",
]);
export const complianceEntityTypeEnum = mysqlEnum("complianceEntityType", [
  "contract",
  "document",
  "professional_registration",
  "leave_request",
]);
export const complianceWorkflowStateEnum = mysqlEnum("complianceWorkflowState", [
  "open",
  "reviewed",
  "replacement_requested",
  "renewal_in_progress",
  "resolved",
]);
export const reminderTypeEnum = mysqlEnum("reminderType", [
  "contract_expiry",
  "document_expiry",
  "registration_expiry",
  "leave_approval",
]);

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: appRoleEnum.default("employee").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  managerName: varchar("managerName", { length: 160 }),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  uuid: varchar("uuid", { length: 64 }).notNull().unique(),
  employeeNumber: varchar("employeeNumber", { length: 32 }).notNull().unique(),
  firstName: varchar("firstName", { length: 120 }).notNull(),
  lastName: varchar("lastName", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  dateOfBirth: date("dateOfBirth").notNull(),
  niNumber: varchar("niNumber", { length: 32 }).notNull(),
  addressLine1: varchar("addressLine1", { length: 255 }).notNull(),
  addressLine2: varchar("addressLine2", { length: 255 }),
  city: varchar("city", { length: 120 }).notNull(),
  postcode: varchar("postcode", { length: 32 }).notNull(),
  departmentId: int("departmentId").notNull(),
  managerId: int("managerId"),
  jobTitle: varchar("jobTitle", { length: 160 }).notNull(),
  employmentStatus: employeeStatusEnum.default("active").notNull(),
  startDate: date("startDate").notNull(),
  archived: boolean("archived").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  contractType: contractTypeEnum.notNull(),
  status: contractStatusEnum.default("draft").notNull(),
  salaryBasis: varchar("salaryBasis", { length: 32 }).notNull(),
  salaryAmount: int("salaryAmount").notNull(),
  hoursPerWeek: int("hoursPerWeek").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  probationEndDate: date("probationEndDate"),
  reviewDate: date("reviewDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  category: documentCategoryEnum.notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  expiryDate: date("expiryDate"),
  status: documentStatusEnum.default("valid").notNull(),
  uploadedBy: varchar("uploadedBy", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const leaveBalances = mysqlTable("leaveBalances", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  year: int("year").notNull(),
  annualDays: int("annualDays").notNull(),
  usedDays: int("usedDays").default(0).notNull(),
  pendingDays: int("pendingDays").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const leaveRequests = mysqlTable("leaveRequests", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  approverId: int("approverId"),
  leaveType: leaveTypeEnum.notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  daysRequested: int("daysRequested").notNull(),
  notes: text("notes"),
  status: leaveStatusEnum.default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const professionalRegistrations = mysqlTable("professionalRegistrations", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  bodyName: varchar("bodyName", { length: 160 }).notNull(),
  registrationNumber: varchar("registrationNumber", { length: 64 }).notNull(),
  annualExpiryDate: date("annualExpiryDate").notNull(),
  reminderDays: int("reminderDays").default(30).notNull(),
  status: registrationStatusEnum.default("valid").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const complianceActions = mysqlTable("complianceActions", {
  id: int("id").autoincrement().primaryKey(),
  entityType: complianceEntityTypeEnum.notNull(),
  entityId: int("entityId").notNull(),
  state: complianceWorkflowStateEnum.default("open").notNull(),
  note: text("note"),
  actorUserId: int("actorUserId").notNull(),
  actorName: varchar("actorName", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reminderActivities = mysqlTable("reminderActivities", {
  id: int("id").autoincrement().primaryKey(),
  reminderType: reminderTypeEnum.notNull(),
  entityType: complianceEntityTypeEnum.notNull(),
  entityId: int("entityId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull(),
  actorName: varchar("actorName", { length: 160 }).notNull(),
  actorRole: appRoleEnum.notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 64 }).notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  changedFields: text("changedFields").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AppRole = (typeof users.$inferSelect)["role"];
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Department = typeof departments.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type ProfessionalRegistration = typeof professionalRegistrations.$inferSelect;
export type ComplianceAction = typeof complianceActions.$inferSelect;
export type ReminderActivity = typeof reminderActivities.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
