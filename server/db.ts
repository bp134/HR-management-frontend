import { and, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import {
  AppRole,
  InsertUser,
  auditLogs,
  complianceActions,
  contracts,
  departments,
  documents,
  employees,
  leaveBalances,
  leaveRequests,
  professionalRegistrations,
  reminderActivities,
  users,
} from "../drizzle/schema";
import { bulkEmployeeCsvHeaders, requiredBulkEmployeeCsvHeaders } from "../shared/hr";
import type {
  ComplianceEntityType,
  ComplianceWorkflowState,
  DocumentCategory as SharedDocumentCategory,
  ReminderType,
} from "../shared/hr";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";

let _db: ReturnType<typeof drizzle> | null = null;
let _hrTablesReady: boolean | null = null;
let _dbSeedAttempted = false;

export function normalizeAppRole(role: unknown): AppRole {
  if (role === "admin" || role === "hr" || role === "manager" || role === "employee") {
    return role;
  }

  if (role === "user") {
    return "employee";
  }

  return "employee";
}

export function resolvePersistedUserRole(user: InsertUser): InsertUser["role"] | undefined {
  if (user.role !== undefined) {
    return user.role;
  }

  if (user.openId === ENV.ownerOpenId) {
    return "admin";
  }

  return undefined;
}

export type EmploymentStatus = "active" | "on_leave" | "probation" | "archived";
export type ContractType = "permanent" | "fixed_term" | "temporary" | "contractor";
export type ContractStatus = "draft" | "active" | "ending_soon" | "expired" | "superseded";
export type DocumentCategory = SharedDocumentCategory;
export type DocumentStatus = "valid" | "expiring" | "expired";
export type LeaveType = "annual" | "sick" | "unpaid" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected";
export type RegistrationStatus = "valid" | "expiring" | "expired";
export type ComplianceState = ComplianceWorkflowState;
export type ComplianceEntity = ComplianceEntityType;
export type HrReminderType = ReminderType;

export type AuthenticatedAppUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: AppRole;
};

export type DepartmentRecord = {
  id: number;
  name: string;
  code: string;
  managerName: string | null;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type EmployeeRecord = {
  id: number;
  uuid: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string;
  niNumber: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postcode: string;
  departmentId: number;
  managerId: number | null;
  jobTitle: string;
  employmentStatus: EmploymentStatus;
  startDate: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ContractRecord = {
  id: number;
  employeeId: number;
  contractType: ContractType;
  status: ContractStatus;
  salaryBasis: string;
  salaryAmount: number;
  hoursPerWeek: number;
  startDate: string;
  endDate: string | null;
  probationEndDate: string | null;
  reviewDate: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentRecord = {
  id: number;
  employeeId: number;
  category: DocumentCategory;
  name: string;
  fileKey: string;
  fileUrl: string;
  expiryDate: string | null;
  status: DocumentStatus;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LeaveBalanceRecord = {
  id: number;
  employeeId: number;
  year: number;
  annualDays: number;
  usedDays: number;
  pendingDays: number;
  updatedAt: Date;
};

export type LeaveRequestRecord = {
  id: number;
  employeeId: number;
  approverId: number | null;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysRequested: number;
  notes: string | null;
  status: LeaveStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ProfessionalRegistrationRecord = {
  id: number;
  employeeId: number;
  bodyName: string;
  registrationNumber: string;
  annualExpiryDate: string;
  reminderDays: number;
  status: RegistrationStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditLogRecord = {
  id: number;
  actorUserId: number;
  actorName: string;
  actorRole: AppRole;
  entityType: string;
  entityId: string;
  action: string;
  changedFields: string;
  createdAt: Date;
};

export type ComplianceActionRecord = {
  id: number;
  entityType: ComplianceEntity;
  entityId: number;
  state: ComplianceState;
  note: string | null;
  actorUserId: number;
  actorName: string;
  createdAt: Date;
};

export type ReminderActivityRecord = {
  id: number;
  reminderType: HrReminderType;
  entityType: ComplianceEntity;
  entityId: number;
  title: string;
  content: string;
  sentAt: Date;
};

export type PilotFeedbackInput = {
  screen: string;
  currentRoute: string;
  summary: string;
  details: string;
};

export type EmployeeFilters = {
  search?: string;
  departmentId?: number | null;
  status?: EmploymentStatus | null;
  managerId?: number | null;
  page?: number;
  pageSize?: number;
};

export type EmployeeWizardInput = {
  personal: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    niNumber: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postcode: string;
    phone?: string;
    email: string;
  };
  employment: {
    employeeNumber: string;
    departmentId: number;
    jobTitle: string;
    managerId?: number | null;
    employmentStatus: EmploymentStatus;
    startDate: string;
  };
  contract: {
    contractType: ContractType;
    salaryBasis: string;
    salaryAmount: number;
    hoursPerWeek: number;
    startDate: string;
    endDate?: string | null;
    probationEndDate?: string | null;
  };
  documents: Array<{
    category: DocumentCategory;
    name: string;
    expiryDate?: string | null;
  }>;
};

export type DepartmentInput = {
  name: string;
  code: string;
  managerName?: string | null;
  description?: string | null;
};

export type ContractInput = {
  employeeId: number;
  contractType: ContractType;
  status: ContractStatus;
  salaryBasis: string;
  salaryAmount: number;
  hoursPerWeek: number;
  startDate: string;
  endDate?: string | null;
  probationEndDate?: string | null;
  reviewDate?: string | null;
};

export type DocumentInput = {
  employeeId: number;
  category: DocumentCategory;
  name: string;
  expiryDate?: string | null;
};

export type LeaveRequestInput = {
  employeeId: number;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  daysRequested: number;
  notes?: string;
};

export type ProfessionalRegistrationInput = {
  employeeId: number;
  bodyName: string;
  registrationNumber: string;
  annualExpiryDate: string;
  reminderDays: number;
};

export type DepartmentUpdateInput = DepartmentInput & {
  departmentId: number;
};

export type ContractUpdateInput = ContractInput & {
  contractId: number;
};

export type SecureDocumentUploadInput = DocumentInput & {
  fileName: string;
  mimeType: string;
  fileDataBase64: string;
};

export type UserAdminRecord = {
  id: number;
  name: string;
  email: string;
  role: AppRole;
  scopeSummary: string;
};

export type UserRoleUpdateInput = {
  userId: number;
  role: AppRole;
};

export type EmployeeCsvExportRow = Record<(typeof bulkEmployeeCsvHeaders)[number], string>;

export type EmployeeCsvExportResult = {
  fileName: string;
  csvContent: string;
  rowCount: number;
  exportedAt: Date;
  auditEntryId: string;
};

export type BulkEmployeeImportError = {
  rowNumber: number;
  employeeNumber: string | null;
  message: string;
};

export type BulkEmployeeImportResult = {
  createdCount: number;
  errorCount: number;
  importedEmployeeNumbers: string[];
  errors: BulkEmployeeImportError[];
  errorReportFileName: string | null;
  errorReportCsv: string | null;
  auditEntryId: string;
};

type HrStoreSnapshot = {
  departments: DepartmentRecord[];
  employees: EmployeeRecord[];
  contracts: ContractRecord[];
  documents: DocumentRecord[];
  leaveBalances: LeaveBalanceRecord[];
  leaveRequests: LeaveRequestRecord[];
  professionalRegistrations: ProfessionalRegistrationRecord[];
  complianceActions: ComplianceActionRecord[];
  reminderActivities: ReminderActivityRecord[];
  auditLogs: AuditLogRecord[];
  userAdminRecords: UserAdminRecord[];
};

const today = new Date();
const currentYear = today.getUTCFullYear();

const initialDepartments: DepartmentRecord[] = [
  {
    id: 1,
    name: "People Operations",
    code: "HR",
    managerName: "Olivia Grant",
    description: "Employee relations, compliance, and workforce planning.",
    active: true,
    createdAt: new Date("2025-01-10T09:00:00Z"),
    updatedAt: new Date("2026-04-01T09:00:00Z"),
  },
  {
    id: 2,
    name: "Operations",
    code: "OPS",
    managerName: "Marcus Shaw",
    description: "Day-to-day service delivery and operational oversight.",
    active: true,
    createdAt: new Date("2025-01-10T09:00:00Z"),
    updatedAt: new Date("2026-04-01T09:00:00Z"),
  },
  {
    id: 3,
    name: "Finance",
    code: "FIN",
    managerName: "Priya Mehta",
    description: "Commercial control, payroll liaison, and reporting.",
    active: true,
    createdAt: new Date("2025-01-10T09:00:00Z"),
    updatedAt: new Date("2026-04-01T09:00:00Z"),
  },
];

const initialEmployees: EmployeeRecord[] = [
  {
    id: 1,
    uuid: "emp_alice_001",
    employeeNumber: "EMP-1001",
    firstName: "Alice",
    lastName: "Morgan",
    email: "alice.morgan@northstar.test",
    phone: "+44 7700 900101",
    dateOfBirth: "1988-02-12",
    niNumber: "QQ123456A",
    addressLine1: "14 Rowan Street",
    addressLine2: null,
    city: "Leeds",
    postcode: "LS1 4AB",
    departmentId: 1,
    managerId: null,
    jobTitle: "Head of People",
    employmentStatus: "active",
    startDate: "2023-04-03",
    archived: false,
    createdAt: new Date("2025-01-10T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
  {
    id: 2,
    uuid: "emp_marcus_002",
    employeeNumber: "EMP-1002",
    firstName: "Marcus",
    lastName: "Shaw",
    email: "marcus.shaw@northstar.test",
    phone: "+44 7700 900102",
    dateOfBirth: "1985-10-05",
    niNumber: "QQ123456B",
    addressLine1: "27 Green Lane",
    addressLine2: null,
    city: "Manchester",
    postcode: "M1 5DD",
    departmentId: 2,
    managerId: 1,
    jobTitle: "Operations Manager",
    employmentStatus: "active",
    startDate: "2022-09-12",
    archived: false,
    createdAt: new Date("2025-01-10T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
  {
    id: 3,
    uuid: "emp_hannah_003",
    employeeNumber: "EMP-1003",
    firstName: "Hannah",
    lastName: "Lee",
    email: "hannah.lee@northstar.test",
    phone: "+44 7700 900103",
    dateOfBirth: "1992-08-11",
    niNumber: "QQ123456C",
    addressLine1: "9 Market Court",
    addressLine2: "Apartment 3",
    city: "Manchester",
    postcode: "M2 2QQ",
    departmentId: 2,
    managerId: 2,
    jobTitle: "Service Coordinator",
    employmentStatus: "probation",
    startDate: "2026-02-10",
    archived: false,
    createdAt: new Date("2026-02-10T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
  {
    id: 4,
    uuid: "emp_priya_004",
    employeeNumber: "EMP-1004",
    firstName: "Priya",
    lastName: "Mehta",
    email: "priya.mehta@northstar.test",
    phone: "+44 7700 900104",
    dateOfBirth: "1987-03-19",
    niNumber: "QQ123456D",
    addressLine1: "83 Victoria Road",
    addressLine2: null,
    city: "Birmingham",
    postcode: "B2 3AD",
    departmentId: 3,
    managerId: 1,
    jobTitle: "Finance Manager",
    employmentStatus: "active",
    startDate: "2024-01-15",
    archived: false,
    createdAt: new Date("2025-01-10T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
];

const initialContracts: ContractRecord[] = [
  {
    id: 1,
    employeeId: 1,
    contractType: "permanent",
    status: "active",
    salaryBasis: "annual",
    salaryAmount: 78000,
    hoursPerWeek: 37,
    startDate: "2023-04-03",
    endDate: null,
    probationEndDate: "2023-10-03",
    reviewDate: "2026-05-10",
    createdAt: new Date("2025-01-10T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
  {
    id: 2,
    employeeId: 2,
    contractType: "permanent",
    status: "active",
    salaryBasis: "annual",
    salaryAmount: 62000,
    hoursPerWeek: 40,
    startDate: "2022-09-12",
    endDate: null,
    probationEndDate: "2023-03-12",
    reviewDate: "2026-04-30",
    createdAt: new Date("2025-01-10T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
  {
    id: 3,
    employeeId: 3,
    contractType: "fixed_term",
    status: "ending_soon",
    salaryBasis: "annual",
    salaryAmount: 34000,
    hoursPerWeek: 37,
    startDate: "2026-02-10",
    endDate: "2026-05-30",
    probationEndDate: "2026-05-10",
    reviewDate: "2026-05-01",
    createdAt: new Date("2026-02-10T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
  {
    id: 4,
    employeeId: 4,
    contractType: "permanent",
    status: "active",
    salaryBasis: "annual",
    salaryAmount: 65000,
    hoursPerWeek: 37,
    startDate: "2024-01-15",
    endDate: null,
    probationEndDate: "2024-07-15",
    reviewDate: "2026-06-01",
    createdAt: new Date("2025-01-10T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
];

const initialDocuments: DocumentRecord[] = [
  {
    id: 1,
    employeeId: 1,
    category: "qualification",
    name: "CIPD Charter Certificate",
    fileKey: "docs/cipd-certificate.pdf",
    fileUrl: "https://example.invalid/docs/cipd-certificate.pdf",
    expiryDate: "2027-04-01",
    status: "valid",
    uploadedBy: "Olivia Grant",
    createdAt: new Date("2025-08-01T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
  {
    id: 2,
    employeeId: 3,
    category: "contract",
    name: "Fixed-term Contract",
    fileKey: "docs/hannah-contract.pdf",
    fileUrl: "https://example.invalid/docs/hannah-contract.pdf",
    expiryDate: "2026-05-30",
    status: "expiring",
    uploadedBy: "Olivia Grant",
    createdAt: new Date("2026-02-10T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
  {
    id: 3,
    employeeId: 3,
    category: "id",
    name: "Passport Copy",
    fileKey: "docs/hannah-passport.pdf",
    fileUrl: "https://example.invalid/docs/hannah-passport.pdf",
    expiryDate: "2026-04-29",
    status: "expiring",
    uploadedBy: "Olivia Grant",
    createdAt: new Date("2026-02-10T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
  {
    id: 4,
    employeeId: 4,
    category: "qualification",
    name: "ACCA Membership",
    fileKey: "docs/priya-acca.pdf",
    fileUrl: "https://example.invalid/docs/priya-acca.pdf",
    expiryDate: "2026-07-15",
    status: "valid",
    uploadedBy: "Olivia Grant",
    createdAt: new Date("2025-10-10T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
];

const initialLeaveBalances: LeaveBalanceRecord[] = [
  { id: 1, employeeId: 1, year: currentYear, annualDays: 30, usedDays: 8, pendingDays: 2, updatedAt: new Date() },
  { id: 2, employeeId: 2, year: currentYear, annualDays: 28, usedDays: 9, pendingDays: 4, updatedAt: new Date() },
  { id: 3, employeeId: 3, year: currentYear, annualDays: 25, usedDays: 2, pendingDays: 3, updatedAt: new Date() },
  { id: 4, employeeId: 4, year: currentYear, annualDays: 28, usedDays: 6, pendingDays: 0, updatedAt: new Date() },
];

const initialLeaveRequests: LeaveRequestRecord[] = [
  {
    id: 1,
    employeeId: 3,
    approverId: 2,
    leaveType: "annual",
    startDate: "2026-04-22",
    endDate: "2026-04-24",
    daysRequested: 3,
    notes: "Family trip",
    status: "pending",
    createdAt: new Date("2026-04-11T09:00:00Z"),
    updatedAt: new Date("2026-04-11T09:00:00Z"),
  },
  {
    id: 2,
    employeeId: 2,
    approverId: 1,
    leaveType: "annual",
    startDate: "2026-05-06",
    endDate: "2026-05-08",
    daysRequested: 3,
    notes: "School holiday cover",
    status: "approved",
    createdAt: new Date("2026-04-02T09:00:00Z"),
    updatedAt: new Date("2026-04-03T09:00:00Z"),
  },
];

const initialProfessionalRegistrations: ProfessionalRegistrationRecord[] = [
  {
    id: 1,
    employeeId: 1,
    bodyName: "CIPD",
    registrationNumber: "CIPD-8831",
    annualExpiryDate: "2026-05-18",
    reminderDays: 30,
    status: "expiring",
    createdAt: new Date("2025-05-18T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
  {
    id: 2,
    employeeId: 4,
    bodyName: "ACCA",
    registrationNumber: "ACCA-5510",
    annualExpiryDate: "2026-07-15",
    reminderDays: 30,
    status: "valid",
    createdAt: new Date("2025-07-15T09:00:00Z"),
    updatedAt: new Date("2026-04-08T10:00:00Z"),
  },
];

const initialUserAdminRecords: UserAdminRecord[] = [
  {
    id: 1,
    name: "System Owner",
    email: "owner@northstar.test",
    role: "admin",
    scopeSummary: "Full organisation access",
  },
  {
    id: 2,
    name: "Olivia Grant",
    email: "olivia.grant@northstar.test",
    role: "hr",
    scopeSummary: "HR operations, onboarding, contracts, documents, and audit",
  },
  {
    id: 3,
    name: "Marcus Shaw",
    email: "marcus.shaw@northstar.test",
    role: "manager",
    scopeSummary: "Team approvals and scoped employee visibility",
  },
];

const initialAuditLogs: AuditLogRecord[] = [
  {
    id: 1,
    actorUserId: 1,
    actorName: "System Owner",
    actorRole: "admin",
    entityType: "employee",
    entityId: "emp_hannah_003",
    action: "employee.updated",
    changedFields: JSON.stringify({ employmentStatus: ["active", "probation"] }),
    createdAt: new Date("2026-04-08T10:30:00Z"),
  },
  {
    id: 2,
    actorUserId: 2,
    actorName: "Marcus Shaw",
    actorRole: "manager",
    entityType: "leave_request",
    entityId: "1",
    action: "leave.requested",
    changedFields: JSON.stringify({ status: [null, "pending"], daysRequested: 3 }),
    createdAt: new Date("2026-04-11T09:00:00Z"),
  },
];

const initialComplianceActions: ComplianceActionRecord[] = [];
const initialReminderActivities: ReminderActivityRecord[] = [];

let departmentSeed = structuredClone(initialDepartments);
let employeeSeed = structuredClone(initialEmployees);
let contractSeed = structuredClone(initialContracts);
let documentSeed = structuredClone(initialDocuments);
let leaveBalanceSeed = structuredClone(initialLeaveBalances);
let leaveRequestSeed = structuredClone(initialLeaveRequests);
let professionalRegistrationSeed = structuredClone(initialProfessionalRegistrations);
let complianceActionSeed = structuredClone(initialComplianceActions);
let reminderActivitySeed = structuredClone(initialReminderActivities);
let userAdminSeed = structuredClone(initialUserAdminRecords);
let auditLogSeed: ReadonlyArray<Readonly<AuditLogRecord>> = sealAuditEntries(structuredClone(initialAuditLogs));

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sealAuditEntries(entries: AuditLogRecord[]) {
  return Object.freeze(entries.map(entry => Object.freeze({ ...entry })));
}

function toDate(value: unknown): Date {
  return value instanceof Date ? value : new Date(String(value));
}

function toDateOnly(value: unknown): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return toDate(value).toISOString().slice(0, 10);
}

function toDateInput(value: string | null | undefined) {
  return value ? new Date(`${value}T00:00:00Z`) : null;
}

function daysUntil(dateValue: string | null | undefined) {
  if (!dateValue) return Number.POSITIVE_INFINITY;
  const target = new Date(`${dateValue}T00:00:00Z`).getTime();
  const diff = target - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function computeDocumentStatus(expiryDate: string | null | undefined): DocumentStatus {
  const remaining = daysUntil(expiryDate);
  if (remaining < 0) return "expired";
  if (remaining <= 30) return "expiring";
  return "valid";
}

function computeContractStatus(contract: ContractRecord): ContractStatus {
  const remaining = daysUntil(contract.endDate);
  if (contract.endDate && remaining < 0) return "expired";
  if (contract.endDate && remaining <= 45) return "ending_soon";
  return contract.status === "draft" ? "draft" : "active";
}

function computeRegistrationStatus(expiryDate: string): RegistrationStatus {
  const remaining = daysUntil(expiryDate);
  if (remaining < 0) return "expired";
  if (remaining <= 30) return "expiring";
  return "valid";
}

function employeeName(employee: Pick<EmployeeRecord, "firstName" | "lastName">) {
  return `${employee.firstName} ${employee.lastName}`;
}

function normalizeCsvCell(value: string | null | undefined) {
  return (value ?? "").trim();
}

function csvEscape(value: string | number | null | undefined) {
  const normalized = String(value ?? "");
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index]!;
    const nextCharacter = csvText[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      if (currentRow.some(cell => normalizeCsvCell(cell) !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell);
  if (currentRow.some(cell => normalizeCsvCell(cell) !== "")) {
    rows.push(currentRow);
  }

  return rows;
}

function serializeEmployeeCsv(rows: EmployeeCsvExportRow[]) {
  const lines = [bulkEmployeeCsvHeaders.join(",")];
  for (const row of rows) {
    lines.push(bulkEmployeeCsvHeaders.map(header => csvEscape(row[header])).join(","));
  }
  return lines.join("\n");
}

function serializeBulkEmployeeImportErrors(errors: BulkEmployeeImportError[]) {
  const headers = ["row_number", "employee_number", "error_message"];
  const lines = [headers.join(",")];
  for (const error of errors) {
    lines.push([
      csvEscape(String(error.rowNumber)),
      csvEscape(error.employeeNumber ?? ""),
      csvEscape(error.message),
    ].join(","));
  }
  return lines.join("\n");
}

function parseBulkEmployeeCsv(csvText: string) {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    throw new Error("The CSV file is empty.");
  }

  const headers = rows[0]!.map(header => normalizeCsvCell(header));
  const missingHeaders = requiredBulkEmployeeCsvHeaders.filter(header => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`The CSV file is missing required headers: ${missingHeaders.join(", ")}.`);
  }

  return rows.slice(1)
    .map((row, index) => ({
      rowNumber: index + 2,
      values: Object.fromEntries(headers.map((header, headerIndex) => [header, row[headerIndex] ?? ""])) as Record<string, string>,
    }))
    .filter(row => Object.values(row.values).some(value => normalizeCsvCell(value) !== ""));
}

function requiredCsvValue(values: Record<string, string>, field: (typeof bulkEmployeeCsvHeaders)[number]) {
  const value = normalizeCsvCell(values[field]);
  if (!value) {
    throw new Error(`${field} is required.`);
  }
  return value;
}

function optionalCsvValue(values: Record<string, string>, field: (typeof bulkEmployeeCsvHeaders)[number]) {
  const value = normalizeCsvCell(values[field]);
  return value === "" ? null : value;
}

function parseCsvIntegerField(rawValue: string | null, field: string, options: { min?: number; max?: number; nullable?: boolean } = {}) {
  if (!rawValue) {
    if (options.nullable) {
      return null;
    }
    throw new Error(`${field} is required.`);
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer.`);
  }
  if (options.min !== undefined && value < options.min) {
    throw new Error(`${field} must be at least ${options.min}.`);
  }
  if (options.max !== undefined && value > options.max) {
    throw new Error(`${field} must be at most ${options.max}.`);
  }
  return value;
}

function parseCsvNumberField(rawValue: string | null, field: string, options: { min?: number } = {}) {
  if (!rawValue) {
    throw new Error(`${field} is required.`);
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be a number.`);
  }
  if (options.min !== undefined && value < options.min) {
    throw new Error(`${field} must be at least ${options.min}.`);
  }
  return value;
}

const supportedSalaryBases = new Set(["annual", "monthly", "weekly", "daily", "hourly"]);

function assertCsvDateOnly(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must use YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} must be a valid calendar date.`);
  }
}

function assertCsvEmail(value: string, field: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${field} must be a valid email address.`);
  }
}

function scopeSummaryForRole(role: AppRole) {
  switch (role) {
    case "admin":
      return "Full organisation access";
    case "hr":
      return "HR operations, onboarding, contracts, documents, and audit";
    case "manager":
      return "Team approvals and scoped employee visibility";
    case "employee":
    default:
      return "Self-service access to personal records, leave requests, and permitted updates";
  }
}

function getFallbackStore(): HrStoreSnapshot {
  return {
    departments: clone(departmentSeed),
    employees: clone(employeeSeed),
    contracts: clone(contractSeed),
    documents: clone(documentSeed),
    leaveBalances: clone(leaveBalanceSeed),
    leaveRequests: clone(leaveRequestSeed),
    professionalRegistrations: clone(professionalRegistrationSeed),
    complianceActions: clone(complianceActionSeed),
    reminderActivities: clone(reminderActivitySeed),
    auditLogs: clone(Array.from(auditLogSeed)),
    userAdminRecords: clone(userAdminSeed),
  };
}

function getActorEmployeeId(user: AuthenticatedAppUser, employeesList: EmployeeRecord[]) {
  const email = user.email?.toLowerCase();
  const name = user.name?.toLowerCase();
  const matched = employeesList.find(employee => {
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    return (email && employee.email.toLowerCase() === email) || (name && fullName === name);
  });

  return matched?.id ?? null;
}

function scopedEmployeesFromStore(user: AuthenticatedAppUser, store: HrStoreSnapshot) {
  const activeEmployees = store.employees.filter(employee => !employee.archived);

  if (user.role === "admin" || user.role === "hr") {
    return activeEmployees;
  }

  const actorEmployeeId = getActorEmployeeId(user, activeEmployees);
  if (!actorEmployeeId) {
    return [];
  }

  if (user.role === "employee") {
    return activeEmployees.filter(employee => employee.id === actorEmployeeId);
  }

  const visibleIds = new Set(
    activeEmployees
      .filter(employee => employee.id === actorEmployeeId || employee.managerId === actorEmployeeId)
      .map(employee => employee.id),
  );

  return activeEmployees.filter(employee => visibleIds.has(employee.id));
}

function resolveLeaveApproverUserId(user: AuthenticatedAppUser, employeeId: number, store: HrStoreSnapshot) {
  if (user.role === "manager") {
    return user.id;
  }

  const employee = store.employees.find(candidate => candidate.id === employeeId);
  if (user.role === "employee" && employee?.managerId) {
    return employee.managerId;
  }

  return 1;
}

function shouldUseDatabaseForHrData() {
  if (process.env.HR_FORCE_DATABASE === "true") {
    return true;
  }

  return process.env.VITEST !== "true" && process.env.NODE_ENV !== "test";
}

function mapDepartmentRow(row: typeof departments.$inferSelect): DepartmentRecord {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    managerName: row.managerName ?? null,
    description: row.description ?? null,
    active: row.active,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function mapEmployeeRow(row: typeof employees.$inferSelect): EmployeeRecord {
  return {
    id: row.id,
    uuid: row.uuid,
    employeeNumber: row.employeeNumber,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone ?? null,
    dateOfBirth: toDateOnly(row.dateOfBirth),
    niNumber: row.niNumber,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2 ?? null,
    city: row.city,
    postcode: row.postcode,
    departmentId: row.departmentId,
    managerId: row.managerId ?? null,
    jobTitle: row.jobTitle,
    employmentStatus: row.employmentStatus,
    startDate: toDateOnly(row.startDate),
    archived: row.archived,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function mapContractRow(row: typeof contracts.$inferSelect): ContractRecord {
  return {
    id: row.id,
    employeeId: row.employeeId,
    contractType: row.contractType,
    status: row.status,
    salaryBasis: row.salaryBasis,
    salaryAmount: row.salaryAmount,
    hoursPerWeek: row.hoursPerWeek,
    startDate: toDateOnly(row.startDate),
    endDate: row.endDate ? toDateOnly(row.endDate) : null,
    probationEndDate: row.probationEndDate ? toDateOnly(row.probationEndDate) : null,
    reviewDate: row.reviewDate ? toDateOnly(row.reviewDate) : null,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function mapDocumentRow(row: typeof documents.$inferSelect): DocumentRecord {
  const expiryDate = row.expiryDate ? toDateOnly(row.expiryDate) : null;
  return {
    id: row.id,
    employeeId: row.employeeId,
    category: row.category,
    name: row.name,
    fileKey: row.fileKey,
    fileUrl: row.fileUrl,
    expiryDate,
    status: computeDocumentStatus(expiryDate),
    uploadedBy: row.uploadedBy,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function mapLeaveBalanceRow(row: typeof leaveBalances.$inferSelect): LeaveBalanceRecord {
  return {
    id: row.id,
    employeeId: row.employeeId,
    year: row.year,
    annualDays: row.annualDays,
    usedDays: row.usedDays,
    pendingDays: row.pendingDays,
    updatedAt: toDate(row.updatedAt),
  };
}

function mapLeaveRequestRow(row: typeof leaveRequests.$inferSelect): LeaveRequestRecord {
  return {
    id: row.id,
    employeeId: row.employeeId,
    approverId: row.approverId ?? null,
    leaveType: row.leaveType,
    startDate: toDateOnly(row.startDate),
    endDate: toDateOnly(row.endDate),
    daysRequested: row.daysRequested,
    notes: row.notes ?? null,
    status: row.status,
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function mapProfessionalRegistrationRow(
  row: typeof professionalRegistrations.$inferSelect,
): ProfessionalRegistrationRecord {
  const annualExpiryDate = toDateOnly(row.annualExpiryDate);
  return {
    id: row.id,
    employeeId: row.employeeId,
    bodyName: row.bodyName,
    registrationNumber: row.registrationNumber,
    annualExpiryDate,
    reminderDays: row.reminderDays,
    status: computeRegistrationStatus(annualExpiryDate),
    createdAt: toDate(row.createdAt),
    updatedAt: toDate(row.updatedAt),
  };
}

function mapAuditRow(row: typeof auditLogs.$inferSelect): AuditLogRecord {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    actorRole: normalizeAppRole(row.actorRole),
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    changedFields: row.changedFields,
    createdAt: toDate(row.createdAt),
  };
}

function mapComplianceActionRow(row: typeof complianceActions.$inferSelect): ComplianceActionRecord {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    state: row.state,
    note: row.note ?? null,
    actorUserId: row.actorUserId,
    actorName: row.actorName,
    createdAt: toDate(row.createdAt),
  };
}

function mapReminderActivityRow(row: typeof reminderActivities.$inferSelect): ReminderActivityRecord {
  return {
    id: row.id,
    reminderType: row.reminderType,
    entityType: row.entityType,
    entityId: row.entityId,
    title: row.title,
    content: row.content,
    sentAt: toDate(row.sentAt),
  };
}

async function hrTablesAreReady() {
  if (!shouldUseDatabaseForHrData()) {
    return false;
  }

  const db = await getDb();
  if (!db) {
    return false;
  }

  if (_hrTablesReady !== null) {
    return _hrTablesReady;
  }

  try {
    await db.select({ id: departments.id }).from(departments).limit(1);
    _hrTablesReady = true;
  } catch (error) {
    console.warn("[Database] HR tables are not ready yet:", error);
    _hrTablesReady = false;
  }

  return _hrTablesReady;
}

async function ensureHrSeedData() {
  if (_dbSeedAttempted) {
    return;
  }

  if (!(await hrTablesAreReady())) {
    return;
  }

  const db = await getDb();
  if (!db) {
    return;
  }

  _dbSeedAttempted = true;

  const existingDepartments = await db.select().from(departments).limit(1);
  if (existingDepartments.length > 0) {
    return;
  }

  for (const user of initialUserAdminRecords) {
    await db
      .insert(users)
      .values({
        id: user.id,
        openId: `seed-${user.role}-${user.id}`,
        name: user.name,
        email: user.email,
        loginMethod: "seed",
        role: user.role,
        lastSignedIn: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: {
          name: user.name,
          email: user.email,
          loginMethod: "seed",
          role: user.role,
          lastSignedIn: new Date(),
        },
      });
  }

  for (const department of initialDepartments) {
    await db.insert(departments).values({
      id: department.id,
      name: department.name,
      code: department.code,
      managerName: department.managerName,
      description: department.description,
      active: department.active,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    });
  }

  for (const employee of initialEmployees) {
    await db.insert(employees).values({
      id: employee.id,
      uuid: employee.uuid,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      dateOfBirth: toDateInput(employee.dateOfBirth)!,
      niNumber: employee.niNumber,
      addressLine1: employee.addressLine1,
      addressLine2: employee.addressLine2,
      city: employee.city,
      postcode: employee.postcode,
      departmentId: employee.departmentId,
      managerId: employee.managerId,
      jobTitle: employee.jobTitle,
      employmentStatus: employee.employmentStatus,
      startDate: toDateInput(employee.startDate)!,
      archived: employee.archived,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    });
  }

  for (const contract of initialContracts) {
    await db.insert(contracts).values({
      id: contract.id,
      employeeId: contract.employeeId,
      contractType: contract.contractType,
      status: contract.status,
      salaryBasis: contract.salaryBasis,
      salaryAmount: contract.salaryAmount,
      hoursPerWeek: contract.hoursPerWeek,
      startDate: toDateInput(contract.startDate)!,
      endDate: toDateInput(contract.endDate),
      probationEndDate: toDateInput(contract.probationEndDate),
      reviewDate: toDateInput(contract.reviewDate),
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    });
  }

  for (const document of initialDocuments) {
    await db.insert(documents).values({
      id: document.id,
      employeeId: document.employeeId,
      category: document.category,
      name: document.name,
      fileKey: document.fileKey,
      fileUrl: document.fileUrl,
      expiryDate: toDateInput(document.expiryDate),
      status: document.status,
      uploadedBy: document.uploadedBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  for (const balance of initialLeaveBalances) {
    await db.insert(leaveBalances).values({
      id: balance.id,
      employeeId: balance.employeeId,
      year: balance.year,
      annualDays: balance.annualDays,
      usedDays: balance.usedDays,
      pendingDays: balance.pendingDays,
      updatedAt: balance.updatedAt,
    });
  }

  for (const request of initialLeaveRequests) {
    await db.insert(leaveRequests).values({
      id: request.id,
      employeeId: request.employeeId,
      approverId: request.approverId,
      leaveType: request.leaveType,
      startDate: toDateInput(request.startDate)!,
      endDate: toDateInput(request.endDate)!,
      daysRequested: request.daysRequested,
      notes: request.notes,
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    });
  }

  for (const record of initialProfessionalRegistrations) {
    await db.insert(professionalRegistrations).values({
      id: record.id,
      employeeId: record.employeeId,
      bodyName: record.bodyName,
      registrationNumber: record.registrationNumber,
      annualExpiryDate: toDateInput(record.annualExpiryDate)!,
      reminderDays: record.reminderDays,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  for (const auditEntry of initialAuditLogs) {
    await db.insert(auditLogs).values({
      id: auditEntry.id,
      actorUserId: auditEntry.actorUserId,
      actorName: auditEntry.actorName,
      actorRole: auditEntry.actorRole,
      entityType: auditEntry.entityType,
      entityId: auditEntry.entityId,
      action: auditEntry.action,
      changedFields: auditEntry.changedFields,
      createdAt: auditEntry.createdAt,
    });
  }
}

async function getStore(): Promise<HrStoreSnapshot> {
  if (!(await hrTablesAreReady())) {
    return getFallbackStore();
  }

  await ensureHrSeedData();
  const db = await getDb();
  if (!db) {
    return getFallbackStore();
  }

  const [
    departmentRows,
    employeeRows,
    contractRows,
    documentRows,
    leaveBalanceRows,
    leaveRequestRows,
    registrationRows,
    auditRows,
    userRows,
  ] = await Promise.all([
    db.select().from(departments),
    db.select().from(employees),
    db.select().from(contracts),
    db.select().from(documents),
    db.select().from(leaveBalances),
    db.select().from(leaveRequests),
    db.select().from(professionalRegistrations),
    db.select().from(auditLogs),
    db.select().from(users),
  ]);

  const complianceActionRecords = await db.select().from(complianceActions)
    .then(rows => rows.map(mapComplianceActionRow))
    .catch(() => clone(complianceActionSeed));
  const reminderActivityRecords = await db.select().from(reminderActivities)
    .then(rows => rows.map(mapReminderActivityRow))
    .catch(() => clone(reminderActivitySeed));

  return {
    departments: departmentRows.map(mapDepartmentRow),
    employees: employeeRows.map(mapEmployeeRow),
    contracts: contractRows.map(mapContractRow),
    documents: documentRows.map(mapDocumentRow),
    leaveBalances: leaveBalanceRows.map(mapLeaveBalanceRow),
    leaveRequests: leaveRequestRows.map(mapLeaveRequestRow),
    professionalRegistrations: registrationRows.map(mapProfessionalRegistrationRow),
    complianceActions: complianceActionRecords.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    reminderActivities: reminderActivityRecords.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime()),
    auditLogs: auditRows.map(mapAuditRow).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    userAdminRecords: userRows.map(row => ({
      id: row.id,
      name: row.name ?? "Unknown user",
      email: row.email ?? `user-${row.id}@example.invalid`,
      role: normalizeAppRole(row.role),
      scopeSummary: scopeSummaryForRole(normalizeAppRole(row.role)),
    })),
  };
}

async function appendAudit(
  actor: AuthenticatedAppUser,
  entityType: string,
  entityId: string,
  action: string,
  changedFields: Record<string, unknown>,
) {
  const entry: AuditLogRecord = {
    id: Date.now(),
    actorUserId: actor.id,
    actorName: actor.name ?? actor.email ?? "Unknown user",
    actorRole: actor.role,
    entityType,
    entityId,
    action,
    changedFields: JSON.stringify(changedFields),
    createdAt: new Date(),
  };

  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (db) {
      await db.insert(auditLogs).values({
        actorUserId: entry.actorUserId,
        actorName: entry.actorName,
        actorRole: entry.actorRole,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        changedFields: entry.changedFields,
        createdAt: entry.createdAt,
      });

      const inserted = (
        await db
          .select()
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.actorUserId, entry.actorUserId),
              eq(auditLogs.entityType, entry.entityType),
              eq(auditLogs.entityId, entry.entityId),
              eq(auditLogs.action, entry.action),
              eq(auditLogs.createdAt, entry.createdAt),
            ),
          )
          .limit(1)
      )[0];

      if (inserted) {
        entry.id = inserted.id;
      }
    }
  } else {
    entry.id = auditLogSeed.length + 1;
    auditLogSeed = sealAuditEntries([{ ...entry }, ...auditLogSeed]);
  }

  return entry;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    const resolvedRole = resolvePersistedUserRole(user);
    if (resolvedRole !== undefined) {
      values.role = resolvedRole;
      updateSet.role = resolvedRole;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (result.length === 0) {
    return undefined;
  }

  const record = result[0] as (typeof result)[number] & { role?: unknown };
  return {
    ...record,
    role: normalizeAppRole(record.role),
  };
}

export async function listUserAdminRecords() {
  const store = await getStore();
  return clone(store.userAdminRecords.sort((a, b) => a.name.localeCompare(b.name)));
}

export async function updateUserRoleRecord(actor: AuthenticatedAppUser, input: UserRoleUpdateInput) {
  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    const existing = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
    const user = existing[0];
    if (!user) return null;

    const previousRole = normalizeAppRole(user.role);
    await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
    await appendAudit(actor, "user", String(input.userId), "user.role.updated", {
      role: [previousRole, input.role],
      email: user.email,
    });

    return {
      id: user.id,
      name: user.name ?? "Unknown user",
      email: user.email ?? `user-${user.id}@example.invalid`,
      role: input.role,
      scopeSummary: scopeSummaryForRole(input.role),
    };
  }

  const user = userAdminSeed.find(candidate => candidate.id === input.userId);
  if (!user) return null;

  const previousRole = user.role;
  user.role = input.role;
  user.scopeSummary = scopeSummaryForRole(input.role);
  await appendAudit(actor, "user", String(user.id), "user.role.updated", {
    role: [previousRole, input.role],
    email: user.email,
  });
  return clone(user);
}

export async function getHrOverview(user: AuthenticatedAppUser) {
  const store = await getStore();
  const scope = scopedEmployeesFromStore(user, store);
  const scopeIds = new Set(scope.map(employee => employee.id));
  const pendingLeave = store.leaveRequests.filter(request => request.status === "pending" && scopeIds.has(request.employeeId));
  const expiringContracts = store.contracts
    .filter(contract => scopeIds.has(contract.employeeId))
    .map(contract => ({ ...contract, status: computeContractStatus(contract) }))
    .filter(contract => contract.status === "ending_soon");
  const expiringDocuments = store.documents
    .filter(document => scopeIds.has(document.employeeId))
    .map(document => ({ ...document, status: computeDocumentStatus(document.expiryDate) }))
    .filter(document => document.status !== "valid");
  const expiringRegistrations = store.professionalRegistrations
    .filter(record => scopeIds.has(record.employeeId))
    .map(record => ({ ...record, status: computeRegistrationStatus(record.annualExpiryDate) }))
    .filter(record => record.status !== "valid");

  const requiredCategories: DocumentCategory[] = ["contract", "id"];
  const missingDocuments = scope.filter(employee => {
    const categories = new Set(
      store.documents
        .filter(document => document.employeeId === employee.id)
        .map(document => document.category),
    );
    return requiredCategories.some(category => !categories.has(category));
  }).length;

  return clone({
    userRole: user.role,
    headcount: scope.length,
    pendingApprovals: pendingLeave.length,
    missingDocuments,
    contractsEndingSoon: expiringContracts.length,
    expiringDocuments: expiringDocuments.length,
    registrationsExpiring: expiringRegistrations.length,
    teamSummary: scope.slice(0, 4).map(employee => ({
      id: employee.id,
      name: employeeName(employee),
      department: store.departments.find(department => department.id === employee.departmentId)?.name ?? "Unknown",
      status: employee.employmentStatus,
    })),
    alerts: [
      ...expiringContracts.map(contract => ({
        title: `${employeeName(store.employees.find(employee => employee.id === contract.employeeId)!)} contract nearing expiry`,
        description: `Contract ends in ${daysUntil(contract.endDate)} days.`,
        severity: "medium" as const,
      })),
      ...expiringDocuments.slice(0, 2).map(document => ({
        title: `${employeeName(store.employees.find(employee => employee.id === document.employeeId)!)} has an expiring ${document.category} document`,
        description: `Document expires in ${daysUntil(document.expiryDate)} days.`,
        severity: "high" as const,
      })),
      ...expiringRegistrations.map(record => ({
        title: `${employeeName(store.employees.find(employee => employee.id === record.employeeId)!)} registration requires renewal`,
        description: `${record.bodyName} expires in ${daysUntil(record.annualExpiryDate)} days.`,
        severity: "high" as const,
      })),
    ].slice(0, 5),
  });
}

export async function listEmployeesForUser(user: AuthenticatedAppUser, filters: EmployeeFilters = {}) {
  const store = await getStore();
  const { search = "", departmentId = null, status = null, managerId = null, page = 1, pageSize = 8 } = filters;
  const query = search.trim().toLowerCase();
  const scoped = scopedEmployeesFromStore(user, store).filter(employee => {
    if (departmentId && employee.departmentId !== departmentId) return false;
    if (status && employee.employmentStatus !== status) return false;
    if (managerId && employee.managerId !== managerId) return false;
    if (!query) return true;

    return [employee.firstName, employee.lastName, employee.employeeNumber, employee.email, employee.jobTitle].some(value =>
      value.toLowerCase().includes(query),
    );
  });

  const start = (page - 1) * pageSize;
  const rows = scoped.slice(start, start + pageSize).map(employee => ({
    ...employee,
    departmentName: store.departments.find(department => department.id === employee.departmentId)?.name ?? "Unknown",
    managerName: employee.managerId
      ? employeeName(store.employees.find(candidate => candidate.id === employee.managerId) ?? employee)
      : "—",
  }));

  return clone({
    rows,
    total: scoped.length,
    page,
    pageSize,
    departments: store.departments.filter(department => department.active),
    managers: store.employees.filter(employee => employee.jobTitle.toLowerCase().includes("manager") || employee.id === 1),
  });
}

export async function exportEmployeesCsvForUser(user: AuthenticatedAppUser, filters: EmployeeFilters = {}) {
  const [list, store] = await Promise.all([
    listEmployeesForUser(user, { ...filters, page: 1, pageSize: 5000 }),
    getStore(),
  ]);

  const rows: EmployeeCsvExportRow[] = list.rows.map(employee => {
    const contract = store.contracts
      .filter(record => record.employeeId === employee.id)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;
    const document = store.documents
      .filter(record => record.employeeId === employee.id)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ?? null;
    const department = store.departments.find(record => record.id === employee.departmentId) ?? null;
    const manager = employee.managerId ? store.employees.find(record => record.id === employee.managerId) ?? null : null;

    return {
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone ?? "",
      dateOfBirth: employee.dateOfBirth,
      niNumber: employee.niNumber,
      addressLine1: employee.addressLine1,
      addressLine2: employee.addressLine2 ?? "",
      city: employee.city,
      postcode: employee.postcode,
      departmentId: String(employee.departmentId),
      managerId: employee.managerId ? String(employee.managerId) : "",
      departmentCode: department?.code ?? "",
      departmentName: department?.name ?? "",
      managerEmployeeNumber: manager?.employeeNumber ?? "",
      managerEmail: manager?.email ?? "",
      jobTitle: employee.jobTitle,
      employmentStatus: employee.employmentStatus,
      startDate: employee.startDate,
      contractType: contract?.contractType ?? "permanent",
      salaryBasis: contract?.salaryBasis ?? "annual",
      salaryAmount: contract ? String(contract.salaryAmount) : "0",
      hoursPerWeek: contract ? String(contract.hoursPerWeek) : "37",
      contractEndDate: contract?.endDate ?? "",
      probationEndDate: contract?.probationEndDate ?? "",
      documentCategory: document?.category ?? "contract",
      documentName: document?.name ?? "Employment Contract",
      documentExpiryDate: document?.expiryDate ?? "",
    };
  });

  const exportedAt = new Date();
  const auditEntry = await appendAudit(user, "employee_bulk_csv", `export-${exportedAt.getTime()}`, "employee.bulk_exported", {
    rowCount: rows.length,
    filters,
    exportedAt: exportedAt.toISOString(),
  });

  return clone({
    fileName: `employee-bulk-export-${exportedAt.toISOString().slice(0, 10)}.csv`,
    csvContent: serializeEmployeeCsv(rows),
    rowCount: rows.length,
    exportedAt,
    auditEntryId: String(auditEntry.id),
  });
}

export async function getEmployeeDetailForUser(user: AuthenticatedAppUser, employeeId: number) {
  const store = await getStore();
  const employee = scopedEmployeesFromStore(user, store).find(candidate => candidate.id === employeeId);
  if (!employee) return null;

  const department = store.departments.find(item => item.id === employee.departmentId) ?? null;
  const manager = employee.managerId ? store.employees.find(item => item.id === employee.managerId) ?? null : null;
  const employeeContracts = store.contracts
    .filter(contract => contract.employeeId === employee.id)
    .map(contract => ({ ...contract, status: computeContractStatus(contract) }));
  const employeeDocuments = store.documents
    .filter(document => document.employeeId === employee.id)
    .map(document => ({ ...document, status: computeDocumentStatus(document.expiryDate) }));
  const leaveHistory = store.leaveRequests.filter(request => request.employeeId === employee.id);
  const leaveBalance = store.leaveBalances.find(balance => balance.employeeId === employee.id) ?? null;
  const registrations = store.professionalRegistrations
    .filter(record => record.employeeId === employee.id)
    .map(record => ({ ...record, status: computeRegistrationStatus(record.annualExpiryDate) }));
  const audit = store.auditLogs.filter(
    entry => entry.entityId === employee.uuid || entry.changedFields.includes(employee.employeeNumber) || entry.entityId === String(employee.id),
  );

  return clone({
    employee,
    department,
    manager,
    contracts: employeeContracts,
    documents: employeeDocuments,
    leaveHistory,
    leaveBalance,
    registrations,
    audit,
  });
}

export async function createEmployeeRecord(user: AuthenticatedAppUser, input: EmployeeWizardInput) {
  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) {
      return null;
    }

    const uuid = `emp_${nanoid(10)}`;
    await db.insert(employees).values({
      uuid,
      employeeNumber: input.employment.employeeNumber,
      firstName: input.personal.firstName,
      lastName: input.personal.lastName,
      email: input.personal.email,
      phone: input.personal.phone ?? null,
      dateOfBirth: toDateInput(input.personal.dateOfBirth)!,
      niNumber: input.personal.niNumber,
      addressLine1: input.personal.addressLine1,
      addressLine2: input.personal.addressLine2 ?? null,
      city: input.personal.city,
      postcode: input.personal.postcode,
      departmentId: input.employment.departmentId,
      managerId: input.employment.managerId ?? null,
      jobTitle: input.employment.jobTitle,
      employmentStatus: input.employment.employmentStatus,
      startDate: toDateInput(input.employment.startDate)!,
      archived: false,
    });

    const createdEmployeeRow = (
      await db.select().from(employees).where(eq(employees.employeeNumber, input.employment.employeeNumber)).limit(1)
    )[0];
    if (!createdEmployeeRow) {
      throw new Error("Employee could not be reloaded after creation");
    }

    await db.insert(contracts).values({
      employeeId: createdEmployeeRow.id,
      contractType: input.contract.contractType,
      status: input.contract.endDate ? "ending_soon" : "active",
      salaryBasis: input.contract.salaryBasis,
      salaryAmount: input.contract.salaryAmount,
      hoursPerWeek: input.contract.hoursPerWeek,
      startDate: toDateInput(input.contract.startDate)!,
      endDate: toDateInput(input.contract.endDate ?? null),
      probationEndDate: toDateInput(input.contract.probationEndDate ?? null),
      reviewDate: toDateInput(input.contract.probationEndDate ?? null),
    });

    await db.insert(leaveBalances).values({
      employeeId: createdEmployeeRow.id,
      year: currentYear,
      annualDays: 25,
      usedDays: 0,
      pendingDays: 0,
    });

    for (const document of input.documents) {
      const slug = document.name.replace(/\s+/g, "-").toLowerCase();
      await db.insert(documents).values({
        employeeId: createdEmployeeRow.id,
        category: document.category,
        name: document.name,
        fileKey: `pending/${uuid}/${slug}`,
        fileUrl: `https://example.invalid/pending/${uuid}/${slug}`,
        expiryDate: toDateInput(document.expiryDate ?? null),
        status: computeDocumentStatus(document.expiryDate),
        uploadedBy: user.name ?? user.email ?? "Unknown user",
      });
    }

    await appendAudit(user, "employee", uuid, "employee.created", {
      employeeNumber: createdEmployeeRow.employeeNumber,
      name: employeeName(createdEmployeeRow),
      departmentId: createdEmployeeRow.departmentId,
      documentCount: input.documents.length,
    });

    const store = await getStore();
    const employee = store.employees.find(item => item.id === createdEmployeeRow.id)!;
    const contract = store.contracts.find(item => item.employeeId === createdEmployeeRow.id)!;
    const createdDocuments = store.documents.filter(item => item.employeeId === createdEmployeeRow.id);
    return clone({ employee, contract, documents: createdDocuments });
  }

  const employeeId = employeeSeed.length + 1;
  const uuid = `emp_${nanoid(10)}`;
  const employee: EmployeeRecord = {
    id: employeeId,
    uuid,
    employeeNumber: input.employment.employeeNumber,
    firstName: input.personal.firstName,
    lastName: input.personal.lastName,
    email: input.personal.email,
    phone: input.personal.phone ?? null,
    dateOfBirth: input.personal.dateOfBirth,
    niNumber: input.personal.niNumber,
    addressLine1: input.personal.addressLine1,
    addressLine2: input.personal.addressLine2 ?? null,
    city: input.personal.city,
    postcode: input.personal.postcode,
    departmentId: input.employment.departmentId,
    managerId: input.employment.managerId ?? null,
    jobTitle: input.employment.jobTitle,
    employmentStatus: input.employment.employmentStatus,
    startDate: input.employment.startDate,
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const contract: ContractRecord = {
    id: contractSeed.length + 1,
    employeeId,
    contractType: input.contract.contractType,
    status: input.contract.endDate ? "ending_soon" : "active",
    salaryBasis: input.contract.salaryBasis,
    salaryAmount: input.contract.salaryAmount,
    hoursPerWeek: input.contract.hoursPerWeek,
    startDate: input.contract.startDate,
    endDate: input.contract.endDate ?? null,
    probationEndDate: input.contract.probationEndDate ?? null,
    reviewDate: input.contract.probationEndDate ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  employeeSeed = [employee, ...employeeSeed];
  contractSeed = [contract, ...contractSeed];
  leaveBalanceSeed = [
    {
      id: leaveBalanceSeed.length + 1,
      employeeId,
      year: currentYear,
      annualDays: 25,
      usedDays: 0,
      pendingDays: 0,
      updatedAt: new Date(),
    },
    ...leaveBalanceSeed,
  ];

  const createdDocuments = input.documents.map((document, index): DocumentRecord => ({
    id: documentSeed.length + index + 1,
    employeeId,
    category: document.category,
    name: document.name,
    fileKey: `documents/${uuid}/${document.name.replace(/\s+/g, "-").toLowerCase()}`,
    fileUrl: `https://example.invalid/documents/${uuid}/${document.name.replace(/\s+/g, "-").toLowerCase()}`,
    expiryDate: document.expiryDate ?? null,
    status: computeDocumentStatus(document.expiryDate),
    uploadedBy: user.name ?? user.email ?? "Unknown user",
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  documentSeed = [...createdDocuments, ...documentSeed];

  await appendAudit(user, "employee", uuid, "employee.created", {
    employeeNumber: employee.employeeNumber,
    name: employeeName(employee),
    departmentId: employee.departmentId,
    documentCount: createdDocuments.length,
  });

  return clone({ employee, contract, documents: createdDocuments });
}

export async function importEmployeesFromCsvForUser(user: AuthenticatedAppUser, csvText: string): Promise<BulkEmployeeImportResult> {
  const store = await getStore();
  const activeDepartments = store.departments.filter(department => department.active);
  const departmentsById = new Map(activeDepartments.map(department => [String(department.id), department]));
  const departmentsByCode = new Map(activeDepartments.map(department => [department.code.trim().toLowerCase(), department]));
  const departmentsByName = new Map(activeDepartments.map(department => [department.name.trim().toLowerCase(), department]));
  const managersById = new Map(store.employees.map(employee => [String(employee.id), employee]));
  const managersByEmployeeNumber = new Map(store.employees.map(employee => [employee.employeeNumber.trim().toLowerCase(), employee]));
  const managersByEmail = new Map(store.employees.map(employee => [employee.email.trim().toLowerCase(), employee]));
  const existingEmployeeNumbers = new Set(store.employees.map(employee => employee.employeeNumber.toLowerCase()));
  const existingEmails = new Set(store.employees.map(employee => employee.email.toLowerCase()));
  const existingNiNumbers = new Set(store.employees.map(employee => employee.niNumber.toLowerCase()));
  const rows = parseBulkEmployeeCsv(csvText);
  const importedEmployeeNumbers: string[] = [];
  const errors: BulkEmployeeImportError[] = [];
  const resolveDepartmentId = (values: Partial<Record<(typeof bulkEmployeeCsvHeaders)[number], string>>) => {
    const departmentIdValue = optionalCsvValue(values, "departmentId");
    const departmentCodeValue = optionalCsvValue(values, "departmentCode");
    const departmentNameValue = optionalCsvValue(values, "departmentName");
    const candidates = [departmentIdValue, departmentCodeValue, departmentNameValue].filter((value): value is string => Boolean(value));

    for (const candidate of candidates) {
      const normalized = candidate.trim().toLowerCase();
      const byId = departmentsById.get(candidate);
      if (byId) {
        return byId.id;
      }
      const byCode = departmentsByCode.get(normalized);
      if (byCode) {
        return byCode.id;
      }
      const byName = departmentsByName.get(normalized);
      if (byName) {
        return byName.id;
      }
    }

    throw new Error("Provide a valid departmentId, departmentCode, or departmentName for an active department.");
  };
  const resolveManagerId = (values: Partial<Record<(typeof bulkEmployeeCsvHeaders)[number], string>>) => {
    const managerIdValue = optionalCsvValue(values, "managerId");
    const managerEmployeeNumberValue = optionalCsvValue(values, "managerEmployeeNumber");
    const managerEmailValue = optionalCsvValue(values, "managerEmail");
    const candidates = [managerIdValue, managerEmployeeNumberValue, managerEmailValue].filter((value): value is string => Boolean(value));

    if (!candidates.length) {
      return null;
    }

    for (const candidate of candidates) {
      const normalized = candidate.trim().toLowerCase();
      const byId = managersById.get(candidate);
      if (byId) {
        return byId.id;
      }
      const byEmployeeNumber = managersByEmployeeNumber.get(normalized);
      if (byEmployeeNumber) {
        return byEmployeeNumber.id;
      }
      const byEmail = managersByEmail.get(normalized);
      if (byEmail) {
        return byEmail.id;
      }
    }

    throw new Error("Provide a valid managerId, managerEmployeeNumber, or managerEmail.");
  };

  for (const row of rows) {
    const employeeNumber = normalizeCsvCell(row.values.employeeNumber || "") || null;

    try {
      const departmentId = resolveDepartmentId(row.values);
      const managerId = resolveManagerId(row.values);

      const employmentStatus = requiredCsvValue(row.values, "employmentStatus") as EmploymentStatus;
      if (!["active", "on_leave", "probation", "archived"].includes(employmentStatus)) {
        throw new Error("employmentStatus must be one of active, on_leave, probation, or archived.");
      }

      const contractType = requiredCsvValue(row.values, "contractType") as ContractType;
      if (!["permanent", "fixed_term", "temporary", "contractor"].includes(contractType)) {
        throw new Error("contractType must be one of permanent, fixed_term, temporary, or contractor.");
      }

      const documentCategory = requiredCsvValue(row.values, "documentCategory") as DocumentCategory;
      if (!["contract", "id", "visa", "qualification", "professional_registration"].includes(documentCategory)) {
        throw new Error("documentCategory must be one of contract, id, visa, qualification, or professional_registration.");
      }

      const employeeNumberValue = requiredCsvValue(row.values, "employeeNumber");
      if (existingEmployeeNumbers.has(employeeNumberValue.toLowerCase())) {
        throw new Error(`employeeNumber ${employeeNumberValue} already exists.`);
      }

      const emailValue = requiredCsvValue(row.values, "email");
      assertCsvEmail(emailValue, "email");
      if (existingEmails.has(emailValue.toLowerCase())) {
        throw new Error(`email ${emailValue} already exists.`);
      }

      const niNumberValue = requiredCsvValue(row.values, "niNumber");
      if (existingNiNumbers.has(niNumberValue.toLowerCase())) {
        throw new Error(`niNumber ${niNumberValue} already exists.`);
      }

      const dateOfBirthValue = requiredCsvValue(row.values, "dateOfBirth");
      assertCsvDateOnly(dateOfBirthValue, "dateOfBirth");

      const startDateValue = requiredCsvValue(row.values, "startDate");
      assertCsvDateOnly(startDateValue, "startDate");

      const contractEndDateValue = optionalCsvValue(row.values, "contractEndDate");
      if (contractEndDateValue) {
        assertCsvDateOnly(contractEndDateValue, "contractEndDate");
      }

      const probationEndDateValue = optionalCsvValue(row.values, "probationEndDate");
      if (probationEndDateValue) {
        assertCsvDateOnly(probationEndDateValue, "probationEndDate");
      }

      const documentExpiryDateValue = optionalCsvValue(row.values, "documentExpiryDate");
      if (documentExpiryDateValue) {
        assertCsvDateOnly(documentExpiryDateValue, "documentExpiryDate");
      }

      const salaryBasisValue = requiredCsvValue(row.values, "salaryBasis").toLowerCase();
      if (!supportedSalaryBases.has(salaryBasisValue)) {
        throw new Error("salaryBasis must be one of annual, monthly, weekly, daily, or hourly.");
      }

      const salaryAmount = parseCsvNumberField(optionalCsvValue(row.values, "salaryAmount"), "salaryAmount", { min: 0 });
      const hoursPerWeek = parseCsvNumberField(optionalCsvValue(row.values, "hoursPerWeek"), "hoursPerWeek", { min: 1 });
      if (hoursPerWeek > 60) {
        throw new Error("hoursPerWeek must be at most 60.");
      }

      const created = await createEmployeeRecord(user, {
        personal: {
          firstName: requiredCsvValue(row.values, "firstName"),
          lastName: requiredCsvValue(row.values, "lastName"),
          dateOfBirth: dateOfBirthValue,
          niNumber: niNumberValue,
          addressLine1: requiredCsvValue(row.values, "addressLine1"),
          addressLine2: optionalCsvValue(row.values, "addressLine2") ?? undefined,
          city: requiredCsvValue(row.values, "city"),
          postcode: requiredCsvValue(row.values, "postcode"),
          phone: optionalCsvValue(row.values, "phone") ?? undefined,
          email: emailValue,
        },
        employment: {
          employeeNumber: employeeNumberValue,
          departmentId,
          managerId,
          jobTitle: requiredCsvValue(row.values, "jobTitle"),
          employmentStatus,
          startDate: startDateValue,
        },
        contract: {
          contractType,
          salaryBasis: salaryBasisValue,
          salaryAmount,
          hoursPerWeek,
          startDate: startDateValue,
          endDate: contractEndDateValue ?? undefined,
          probationEndDate: probationEndDateValue ?? undefined,
        },
        documents: [
          {
            category: documentCategory,
            name: requiredCsvValue(row.values, "documentName"),
            expiryDate: documentExpiryDateValue ?? undefined,
          },
        ],
      });

      if (!created) {
        throw new Error("The employee could not be created from this row.");
      }

      importedEmployeeNumbers.push(created.employee.employeeNumber);
      existingEmployeeNumbers.add(employeeNumberValue.toLowerCase());
      existingEmails.add(emailValue.toLowerCase());
      existingNiNumbers.add(niNumberValue.toLowerCase());
    } catch (error) {
      errors.push({
        rowNumber: row.rowNumber,
        employeeNumber,
        message: error instanceof Error ? error.message : "Unknown import error.",
      });
    }
  }

  const completedAt = new Date();
  const errorReportCsv = errors.length > 0 ? serializeBulkEmployeeImportErrors(errors) : null;
  const errorReportFileName = errorReportCsv
    ? `employee-bulk-import-errors-${completedAt.toISOString().slice(0, 10)}.csv`
    : null;
  const auditEntry = await appendAudit(user, "employee_bulk_csv", `import-${completedAt.getTime()}`, "employee.bulk_imported", {
    createdCount: importedEmployeeNumbers.length,
    errorCount: errors.length,
    importedEmployeeNumbers,
    errorReportFileName,
    completedAt: completedAt.toISOString(),
  });

  return clone({
    createdCount: importedEmployeeNumbers.length,
    errorCount: errors.length,
    importedEmployeeNumbers,
    errors,
    errorReportFileName,
    errorReportCsv,
    auditEntryId: String(auditEntry.id),
  });
}

export async function archiveEmployeeRecord(user: AuthenticatedAppUser, employeeId: number) {
  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    const existing = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
    const employee = existing[0];
    if (!employee) return null;

    await db.update(employees).set({ archived: true, employmentStatus: "archived", updatedAt: new Date() }).where(eq(employees.id, employeeId));
    await appendAudit(user, "employee", employee.uuid, "employee.archived", {
      archived: [employee.archived, true],
      employmentStatus: [employee.employmentStatus, "archived"],
    });

    const refreshed = (await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1))[0];
    return refreshed ? clone(mapEmployeeRow(refreshed)) : null;
  }

  const employee = employeeSeed.find(candidate => candidate.id === employeeId);
  if (!employee) return null;

  employee.archived = true;
  employee.employmentStatus = "archived";
  employee.updatedAt = new Date();

  await appendAudit(user, "employee", employee.uuid, "employee.archived", {
    archived: [false, true],
    employmentStatus: ["active", "archived"],
  });

  return clone(employee);
}

export async function listDepartments() {
  const store = await getStore();
  return clone(store.departments);
}

export async function createDepartmentRecord(user: AuthenticatedAppUser, input: DepartmentInput) {
  const normalizedCode = input.code.toUpperCase();

  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    await db.insert(departments).values({
      name: input.name,
      code: normalizedCode,
      managerName: input.managerName ?? null,
      description: input.description ?? null,
      active: true,
    });

    const created = (await db.select().from(departments).where(eq(departments.code, normalizedCode)).limit(1))[0];
    if (!created) return null;
    await appendAudit(user, "department", String(created.id), "department.created", {
      name: created.name,
      code: created.code,
    });
    return clone(mapDepartmentRow(created));
  }

  const department: DepartmentRecord = {
    id: departmentSeed.length + 1,
    name: input.name,
    code: normalizedCode,
    managerName: input.managerName ?? null,
    description: input.description ?? null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  departmentSeed = [department, ...departmentSeed];
  await appendAudit(user, "department", String(department.id), "department.created", {
    name: department.name,
    code: department.code,
  });
  return clone(department);
}

export async function updateDepartmentRecord(user: AuthenticatedAppUser, input: DepartmentUpdateInput) {
  const normalizedCode = input.code.toUpperCase();

  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    const existing = (await db.select().from(departments).where(eq(departments.id, input.departmentId)).limit(1))[0];
    if (!existing) return null;

    await db.update(departments).set({
      name: input.name,
      code: normalizedCode,
      managerName: input.managerName ?? null,
      description: input.description ?? null,
      updatedAt: new Date(),
    }).where(eq(departments.id, input.departmentId));

    await appendAudit(user, "department", String(input.departmentId), "department.updated", {
      name: [existing.name, input.name],
      code: [existing.code, normalizedCode],
      managerName: [existing.managerName ?? null, input.managerName ?? null],
      description: [existing.description ?? null, input.description ?? null],
    });

    const refreshed = (await db.select().from(departments).where(eq(departments.id, input.departmentId)).limit(1))[0];
    return refreshed ? clone(mapDepartmentRow(refreshed)) : null;
  }

  const department = departmentSeed.find(candidate => candidate.id === input.departmentId);
  if (!department) return null;

  const previous = { ...department };
  department.name = input.name;
  department.code = normalizedCode;
  department.managerName = input.managerName ?? null;
  department.description = input.description ?? null;
  department.updatedAt = new Date();

  await appendAudit(user, "department", String(department.id), "department.updated", {
    name: [previous.name, department.name],
    code: [previous.code, department.code],
    managerName: [previous.managerName, department.managerName],
    description: [previous.description, department.description],
  });
  return clone(department);
}

export async function archiveDepartmentRecord(user: AuthenticatedAppUser, departmentId: number) {
  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    const existing = (await db.select().from(departments).where(eq(departments.id, departmentId)).limit(1))[0];
    if (!existing) return null;

    await db.update(departments).set({ active: false, updatedAt: new Date() }).where(eq(departments.id, departmentId));
    await appendAudit(user, "department", String(departmentId), "department.archived", { active: [existing.active, false] });
    const refreshed = (await db.select().from(departments).where(eq(departments.id, departmentId)).limit(1))[0];
    return refreshed ? clone(mapDepartmentRow(refreshed)) : null;
  }

  const department = departmentSeed.find(candidate => candidate.id === departmentId);
  if (!department) return null;

  department.active = false;
  department.updatedAt = new Date();
  await appendAudit(user, "department", String(department.id), "department.archived", {
    active: [true, false],
  });
  return clone(department);
}

export async function listContractsForUser(user: AuthenticatedAppUser) {
  const store = await getStore();
  const visibleEmployees = new Set(scopedEmployeesFromStore(user, store).map(employee => employee.id));
  return clone(
    store.contracts
      .filter(contract => visibleEmployees.has(contract.employeeId))
      .map(contract => ({
        ...contract,
        employeeName: employeeName(store.employees.find(employee => employee.id === contract.employeeId)!),
        status: computeContractStatus(contract),
      })),
  );
}

export async function createContractRecord(user: AuthenticatedAppUser, input: ContractInput) {
  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    await db.insert(contracts).values({
      employeeId: input.employeeId,
      contractType: input.contractType,
      status: input.status,
      salaryBasis: input.salaryBasis,
      salaryAmount: input.salaryAmount,
      hoursPerWeek: input.hoursPerWeek,
      startDate: toDateInput(input.startDate)!,
      endDate: toDateInput(input.endDate ?? null),
      probationEndDate: toDateInput(input.probationEndDate ?? null),
      reviewDate: toDateInput(input.reviewDate ?? null),
    });

    const store = await getStore();
    const contract = store.contracts
      .filter(candidate => candidate.employeeId === input.employeeId)
      .sort((a, b) => b.id - a.id)[0];
    if (!contract) return null;
    await appendAudit(user, "contract", String(contract.id), "contract.created", {
      employeeId: contract.employeeId,
      contractType: contract.contractType,
    });
    return clone(contract);
  }

  const contract: ContractRecord = {
    id: contractSeed.length + 1,
    employeeId: input.employeeId,
    contractType: input.contractType,
    status: input.status,
    salaryBasis: input.salaryBasis,
    salaryAmount: input.salaryAmount,
    hoursPerWeek: input.hoursPerWeek,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    probationEndDate: input.probationEndDate ?? null,
    reviewDate: input.reviewDate ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  contractSeed = [contract, ...contractSeed];
  await appendAudit(user, "contract", String(contract.id), "contract.created", {
    employeeId: contract.employeeId,
    contractType: contract.contractType,
  });
  return clone(contract);
}

export async function updateContractRecord(user: AuthenticatedAppUser, input: ContractUpdateInput) {
  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    const existing = (await db.select().from(contracts).where(eq(contracts.id, input.contractId)).limit(1))[0];
    if (!existing) return null;

    await db.update(contracts).set({
      employeeId: input.employeeId,
      contractType: input.contractType,
      status: input.status,
      salaryBasis: input.salaryBasis,
      salaryAmount: input.salaryAmount,
      hoursPerWeek: input.hoursPerWeek,
      startDate: toDateInput(input.startDate)!,
      endDate: toDateInput(input.endDate ?? null),
      probationEndDate: toDateInput(input.probationEndDate ?? null),
      reviewDate: toDateInput(input.reviewDate ?? null),
      updatedAt: new Date(),
    }).where(eq(contracts.id, input.contractId));

    await appendAudit(user, "contract", String(input.contractId), "contract.updated", {
      employeeId: [existing.employeeId, input.employeeId],
      contractType: [existing.contractType, input.contractType],
      status: [existing.status, input.status],
      endDate: [existing.endDate ? toDateOnly(existing.endDate) : null, input.endDate ?? null],
      reviewDate: [existing.reviewDate ? toDateOnly(existing.reviewDate) : null, input.reviewDate ?? null],
    });

    const refreshed = (await db.select().from(contracts).where(eq(contracts.id, input.contractId)).limit(1))[0];
    return refreshed ? clone(mapContractRow(refreshed)) : null;
  }

  const contract = contractSeed.find(candidate => candidate.id === input.contractId);
  if (!contract) return null;

  const previous = { ...contract };
  contract.employeeId = input.employeeId;
  contract.contractType = input.contractType;
  contract.status = input.status;
  contract.salaryBasis = input.salaryBasis;
  contract.salaryAmount = input.salaryAmount;
  contract.hoursPerWeek = input.hoursPerWeek;
  contract.startDate = input.startDate;
  contract.endDate = input.endDate ?? null;
  contract.probationEndDate = input.probationEndDate ?? null;
  contract.reviewDate = input.reviewDate ?? null;
  contract.updatedAt = new Date();

  await appendAudit(user, "contract", String(contract.id), "contract.updated", {
    employeeId: [previous.employeeId, contract.employeeId],
    contractType: [previous.contractType, contract.contractType],
    status: [previous.status, contract.status],
    endDate: [previous.endDate, contract.endDate],
    reviewDate: [previous.reviewDate, contract.reviewDate],
  });
  return clone(contract);
}

export async function listDocumentsForUser(user: AuthenticatedAppUser) {
  const store = await getStore();
  const visibleEmployees = new Set(scopedEmployeesFromStore(user, store).map(employee => employee.id));
  return clone(
    store.documents
      .filter(document => visibleEmployees.has(document.employeeId))
      .map(document => ({
        ...document,
        employeeName: employeeName(store.employees.find(employee => employee.id === document.employeeId)!),
        status: computeDocumentStatus(document.expiryDate),
      })),
  );
}

export async function uploadDocumentRecord(user: AuthenticatedAppUser, input: SecureDocumentUploadInput) {
  const sanitizedName = input.fileName.replace(/\s+/g, "-").toLowerCase();
  const binary = Buffer.from(input.fileDataBase64, "base64");
  const stored = await storagePut(`documents/${input.employeeId}/${Date.now()}-${sanitizedName}`, binary, input.mimeType);

  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    await db.insert(documents).values({
      employeeId: input.employeeId,
      category: input.category,
      name: input.name,
      fileKey: stored.key,
      fileUrl: stored.url,
      expiryDate: toDateInput(input.expiryDate ?? null),
      status: computeDocumentStatus(input.expiryDate),
      uploadedBy: user.name ?? user.email ?? "Unknown user",
    });

    const store = await getStore();
    const document = store.documents
      .filter(candidate => candidate.employeeId === input.employeeId)
      .sort((a, b) => b.id - a.id)[0];
    if (!document) return null;
    await appendAudit(user, "document", String(document.id), "document.uploaded", {
      employeeId: document.employeeId,
      category: document.category,
      expiryDate: toDateInput(document.expiryDate),
      fileKey: document.fileKey,
    });
    return clone(document);
  }

  const document: DocumentRecord = {
    id: documentSeed.length + 1,
    employeeId: input.employeeId,
    category: input.category,
    name: input.name,
    fileKey: stored.key,
    fileUrl: stored.url,
    expiryDate: input.expiryDate ?? null,
    status: computeDocumentStatus(input.expiryDate),
    uploadedBy: user.name ?? user.email ?? "Unknown user",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  documentSeed = [document, ...documentSeed];
  await appendAudit(user, "document", String(document.id), "document.uploaded", {
    employeeId: document.employeeId,
    category: document.category,
    expiryDate: document.expiryDate,
    fileKey: document.fileKey,
  });
  return clone(document);
}

export async function listLeaveForUser(user: AuthenticatedAppUser) {
  const store = await getStore();
  const visibleEmployees = new Set(scopedEmployeesFromStore(user, store).map(employee => employee.id));
  const requests = store.leaveRequests
    .filter(request => visibleEmployees.has(request.employeeId))
    .map(request => ({
      ...request,
      employeeName: employeeName(store.employees.find(employee => employee.id === request.employeeId)!),
    }));

  return clone({
    requests,
    calendar: requests.map(request => ({
      id: request.id,
      label: `${request.employeeName} · ${request.leaveType}`,
      startDate: toDateInput(request.startDate)!,
      endDate: toDateInput(request.endDate)!,
      status: request.status,
    })),
    balances: store.leaveBalances,
  });
}

export async function createLeaveRequestRecord(user: AuthenticatedAppUser, input: LeaveRequestInput) {
  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    const existingBalance = (
      await db
        .select()
        .from(leaveBalances)
        .where(and(eq(leaveBalances.employeeId, input.employeeId), eq(leaveBalances.year, currentYear)))
        .limit(1)
    )[0];

    if (existingBalance) {
      await db
        .update(leaveBalances)
        .set({ pendingDays: existingBalance.pendingDays + input.daysRequested, updatedAt: new Date() })
        .where(eq(leaveBalances.id, existingBalance.id));
    }

    await db.insert(leaveRequests).values({
      employeeId: input.employeeId,
      approverId: resolveLeaveApproverUserId(user, input.employeeId, await getStore()),
      leaveType: input.leaveType,
      startDate: toDateInput(input.startDate)!,
      endDate: toDateInput(input.endDate)!,
      daysRequested: input.daysRequested,
      notes: input.notes ?? null,
      status: "pending",
    });

    const store = await getStore();
    const request = store.leaveRequests.filter(candidate => candidate.employeeId === input.employeeId).sort((a, b) => b.id - a.id)[0];
    if (!request) return null;
    await appendAudit(user, "leave_request", String(request.id), "leave.requested", {
      employeeId: request.employeeId,
      leaveType: request.leaveType,
      status: request.status,
    });
    return clone(request);
  }

  const request: LeaveRequestRecord = {
    id: leaveRequestSeed.length + 1,
    employeeId: input.employeeId,
    approverId: resolveLeaveApproverUserId(user, input.employeeId, await getStore()),
    leaveType: input.leaveType,
    startDate: input.startDate,
    endDate: input.endDate,
    daysRequested: input.daysRequested,
    notes: input.notes ?? null,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  leaveRequestSeed = [request, ...leaveRequestSeed];
  const balance = leaveBalanceSeed.find(candidate => candidate.employeeId === input.employeeId);
  if (balance) {
    balance.pendingDays += input.daysRequested;
    balance.updatedAt = new Date();
  }

  await appendAudit(user, "leave_request", String(request.id), "leave.requested", {
    employeeId: request.employeeId,
    leaveType: request.leaveType,
    status: request.status,
  });

  return clone(request);
}

export async function approveLeaveRequestRecord(user: AuthenticatedAppUser, requestId: number) {
  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    const request = (await db.select().from(leaveRequests).where(eq(leaveRequests.id, requestId)).limit(1))[0];
    if (!request) return null;

    await db.update(leaveRequests).set({ status: "approved", approverId: user.id, updatedAt: new Date() }).where(eq(leaveRequests.id, requestId));

    const balance = (
      await db
        .select()
        .from(leaveBalances)
        .where(and(eq(leaveBalances.employeeId, request.employeeId), eq(leaveBalances.year, currentYear)))
        .limit(1)
    )[0];
    if (balance) {
      await db
        .update(leaveBalances)
        .set({
          pendingDays: Math.max(0, balance.pendingDays - request.daysRequested),
          usedDays: balance.usedDays + request.daysRequested,
          updatedAt: new Date(),
        })
        .where(eq(leaveBalances.id, balance.id));
    }

    await appendAudit(user, "leave_request", String(requestId), "leave.approved", {
      status: [request.status, "approved"],
      approverId: user.id,
    });

    const refreshed = (await db.select().from(leaveRequests).where(eq(leaveRequests.id, requestId)).limit(1))[0];
    return refreshed ? clone(mapLeaveRequestRow(refreshed)) : null;
  }

  const request = leaveRequestSeed.find(candidate => candidate.id === requestId);
  if (!request) return null;

  request.status = "approved";
  request.approverId = user.id;
  request.updatedAt = new Date();

  const balance = leaveBalanceSeed.find(candidate => candidate.employeeId === request.employeeId);
  if (balance) {
    balance.pendingDays = Math.max(0, balance.pendingDays - request.daysRequested);
    balance.usedDays += request.daysRequested;
    balance.updatedAt = new Date();
  }

  await appendAudit(user, "leave_request", String(request.id), "leave.approved", {
    status: ["pending", "approved"],
    approverId: user.id,
  });

  return clone(request);
}

export async function listAuditLogsForUser() {
  const store = await getStore();
  return clone(store.auditLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
}

export async function describeAuditStoragePolicy() {
  return {
    mode: "append_only" as const,
    storage: (await hrTablesAreReady()) ? "database_append_only_log" : "sealed_in_memory_log",
    guarantees: [
      "New audit entries are appended as new immutable records.",
      "Existing audit entries are never updated through the application service layer.",
      "No update or delete mutation is exposed for audit records.",
    ],
  };
}

export async function listProfessionalRegistrationsForUser(user: AuthenticatedAppUser) {
  const store = await getStore();
  const visibleEmployees = new Set(scopedEmployeesFromStore(user, store).map(employee => employee.id));
  return clone(
    store.professionalRegistrations
      .filter(record => visibleEmployees.has(record.employeeId))
      .map(record => ({
        ...record,
        employeeName: employeeName(store.employees.find(employee => employee.id === record.employeeId)!),
        status: computeRegistrationStatus(record.annualExpiryDate),
      })),
  );
}

export async function createProfessionalRegistrationRecord(user: AuthenticatedAppUser, input: ProfessionalRegistrationInput) {
  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    await db.insert(professionalRegistrations).values({
      employeeId: input.employeeId,
      bodyName: input.bodyName,
      registrationNumber: input.registrationNumber,
      annualExpiryDate: toDateInput(input.annualExpiryDate)!,
      reminderDays: input.reminderDays,
      status: computeRegistrationStatus(input.annualExpiryDate),
    });

    const store = await getStore();
    const record = store.professionalRegistrations
      .filter(candidate => candidate.employeeId === input.employeeId)
      .sort((a, b) => b.id - a.id)[0];
    if (!record) return null;
    await appendAudit(user, "professional_registration", String(record.id), "registration.created", {
      employeeId: record.employeeId,
      expiryDate: record.annualExpiryDate,
    });
    return clone(record);
  }

  const record: ProfessionalRegistrationRecord = {
    id: professionalRegistrationSeed.length + 1,
    employeeId: input.employeeId,
    bodyName: input.bodyName,
    registrationNumber: input.registrationNumber,
    annualExpiryDate: input.annualExpiryDate,
    reminderDays: input.reminderDays,
    status: computeRegistrationStatus(input.annualExpiryDate),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  professionalRegistrationSeed = [record, ...professionalRegistrationSeed];
  await appendAudit(user, "professional_registration", String(record.id), "registration.created", {
    employeeId: record.employeeId,
    expiryDate: record.annualExpiryDate,
  });
  return clone(record);
}

export type ComplianceListItem = {
  entityType: Exclude<ComplianceEntity, "leave_request">;
  entityId: number;
  employeeId: number;
  employeeName: string;
  title: string;
  description: string;
  severity: "medium" | "high";
  dueDate: string | null;
  daysRemaining: number | null;
  currentState: ComplianceState;
  lastActionAt: Date | null;
  lastActionBy: string | null;
  lastActionNote: string | null;
};

export type ReminderDigestResult = {
  sent: boolean;
  reminderCount: number;
  summary: string;
  sentAt: Date | null;
  reminderTypes: HrReminderType[];
};

function addDays(dateOnly: string | null | undefined, days: number) {
  const base = dateOnly ? new Date(`${dateOnly}T00:00:00Z`) : new Date();
  base.setUTCDate(base.getUTCDate() + days);
  return toDateOnly(base);
}

function latestComplianceAction(
  store: HrStoreSnapshot,
  entityType: Exclude<ComplianceEntity, "leave_request">,
  entityId: number,
) {
  return (
    store.complianceActions
      .filter(action => action.entityType === entityType && action.entityId === entityId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
  );
}

function mapComplianceItem(
  store: HrStoreSnapshot,
  entityType: Exclude<ComplianceEntity, "leave_request">,
  entityId: number,
  employeeId: number,
  title: string,
  description: string,
  severity: "medium" | "high",
  dueDate: string | null,
) {
  const employee = store.employees.find(candidate => candidate.id === employeeId);
  const latestAction = latestComplianceAction(store, entityType, entityId);

  return {
    entityType,
    entityId,
    employeeId,
    employeeName: employee ? employeeName(employee) : "Unknown employee",
    title,
    description,
    severity,
    dueDate,
    daysRemaining: dueDate ? daysUntil(dueDate) : null,
    currentState: latestAction?.state ?? "open",
    lastActionAt: latestAction?.createdAt ?? null,
    lastActionBy: latestAction?.actorName ?? null,
    lastActionNote: latestAction?.note ?? null,
  } satisfies ComplianceListItem;
}

function buildComplianceItems(store: HrStoreSnapshot, employeeIds: Set<number>) {
  const contractItems = store.contracts
    .filter(contract => employeeIds.has(contract.employeeId))
    .map(contract => ({ ...contract, status: computeContractStatus(contract) }))
    .filter(contract => contract.status === "ending_soon" || contract.status === "expired")
    .map(contract =>
      mapComplianceItem(
        store,
        "contract",
        contract.id,
        contract.employeeId,
        `${employeeName(store.employees.find(employee => employee.id === contract.employeeId)!)} contract`,
        contract.endDate
          ? `Contract ${contract.status === "expired" ? "expired" : "ends"} on ${contract.endDate}.`
          : "Contract should be reviewed.",
        contract.status === "expired" ? "high" : "medium",
        contract.endDate,
      ),
    );

  const documentItems = store.documents
    .filter(document => employeeIds.has(document.employeeId))
    .map(document => ({ ...document, status: computeDocumentStatus(document.expiryDate) }))
    .filter(document => document.status === "expiring" || document.status === "expired")
    .map(document =>
      mapComplianceItem(
        store,
        "document",
        document.id,
        document.employeeId,
        `${employeeName(store.employees.find(employee => employee.id === document.employeeId)!)} ${document.name}`,
        `${document.category.replace(/_/g, " ")} ${document.status === "expired" ? "expired" : "expires soon"}.`,
        document.status === "expired" ? "high" : "medium",
        document.expiryDate,
      ),
    );

  const registrationItems = store.professionalRegistrations
    .filter(record => employeeIds.has(record.employeeId))
    .map(record => ({ ...record, status: computeRegistrationStatus(record.annualExpiryDate) }))
    .filter(record => record.status === "expiring" || record.status === "expired")
    .map(record =>
      mapComplianceItem(
        store,
        "professional_registration",
        record.id,
        record.employeeId,
        `${employeeName(store.employees.find(employee => employee.id === record.employeeId)!)} ${record.bodyName}`,
        `${record.bodyName} registration ${record.status === "expired" ? "expired" : "expires soon"}.`,
        record.status === "expired" ? "high" : "medium",
        record.annualExpiryDate,
      ),
    );

  return [...contractItems, ...documentItems, ...registrationItems].sort((a, b) => {
    const left = a.dueDate ? new Date(`${a.dueDate}T00:00:00Z`).getTime() : Number.MAX_SAFE_INTEGER;
    const right = b.dueDate ? new Date(`${b.dueDate}T00:00:00Z`).getTime() : Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}

async function insertComplianceActionRecord(
  user: AuthenticatedAppUser,
  entityType: Exclude<ComplianceEntity, "leave_request">,
  entityId: number,
  state: ComplianceState,
  note?: string | null,
) {
  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    try {
      await db.insert(complianceActions).values({
        entityType,
        entityId,
        state,
        note: note ?? null,
        actorUserId: user.id,
        actorName: user.name ?? user.email ?? "Unknown user",
        createdAt: new Date(),
      });

      const latest = (
        await db.select().from(complianceActions).where(and(eq(complianceActions.entityType, entityType), eq(complianceActions.entityId, entityId)))
      )
        .map(mapComplianceActionRow)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

      return latest ?? null;
    } catch {
      // Fall back to the in-memory compatibility store when the latest workflow table is not yet migrated.
    }
  }

  const record: ComplianceActionRecord = {
    id: complianceActionSeed.length + 1,
    entityType,
    entityId,
    state,
    note: note ?? null,
    actorUserId: user.id,
    actorName: user.name ?? user.email ?? "Unknown user",
    createdAt: new Date(),
  };
  complianceActionSeed = [record, ...complianceActionSeed];
  return clone(record);
}

async function insertReminderActivityRecords(records: Omit<ReminderActivityRecord, "id">[]) {
  if (records.length === 0) return [] as ReminderActivityRecord[];

  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return [] as ReminderActivityRecord[];
    try {
      await db.insert(reminderActivities).values(records);
      const freshRows = await db.select().from(reminderActivities);
      return freshRows.map(mapReminderActivityRow).sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime()).slice(0, records.length);
    } catch {
      // Fall back to the in-memory compatibility store when the reminder table is not yet migrated.
    }
  }

  const created = records.map((record, index) => ({ id: reminderActivitySeed.length + index + 1, ...record }));
  reminderActivitySeed = [...created, ...reminderActivitySeed];
  return clone(created);
}

function reminderRecentlySent(store: HrStoreSnapshot, type: HrReminderType, entityType: ComplianceEntity, entityId: number) {
  const threshold = Date.now() - 24 * 60 * 60 * 1000;
  return store.reminderActivities.some(
    activity =>
      activity.reminderType === type &&
      activity.entityType === entityType &&
      activity.entityId === entityId &&
      activity.sentAt.getTime() >= threshold,
  );
}

function buildDueReminderEntries(store: HrStoreSnapshot, employeeIds: Set<number>) {
  const items: Array<Omit<ReminderActivityRecord, "id">> = [];

  for (const contract of store.contracts.filter(candidate => employeeIds.has(candidate.employeeId))) {
    const status = computeContractStatus(contract);
    if ((status === "ending_soon" || status === "expired") && !reminderRecentlySent(store, "contract_expiry", "contract", contract.id)) {
      const employee = store.employees.find(candidate => candidate.id === contract.employeeId);
      items.push({
        reminderType: "contract_expiry",
        entityType: "contract",
        entityId: contract.id,
        title: `Contract reminder: ${employee ? employeeName(employee) : `Employee ${contract.employeeId}`}`,
        content: `Contract ${status === "expired" ? "expired" : "ends soon"}${contract.endDate ? ` on ${contract.endDate}` : ""}.`,
        sentAt: new Date(),
      });
    }
  }

  for (const document of store.documents.filter(candidate => employeeIds.has(candidate.employeeId))) {
    const status = computeDocumentStatus(document.expiryDate);
    if ((status === "expiring" || status === "expired") && !reminderRecentlySent(store, "document_expiry", "document", document.id)) {
      const employee = store.employees.find(candidate => candidate.id === document.employeeId);
      items.push({
        reminderType: "document_expiry",
        entityType: "document",
        entityId: document.id,
        title: `Document reminder: ${employee ? employeeName(employee) : `Employee ${document.employeeId}`}`,
        content: `${document.name} ${status === "expired" ? "expired" : "expires soon"}${document.expiryDate ? ` on ${document.expiryDate}` : ""}.`,
        sentAt: new Date(),
      });
    }
  }

  for (const record of store.professionalRegistrations.filter(candidate => employeeIds.has(candidate.employeeId))) {
    const status = computeRegistrationStatus(record.annualExpiryDate);
    if ((status === "expiring" || status === "expired") && !reminderRecentlySent(store, "registration_expiry", "professional_registration", record.id)) {
      const employee = store.employees.find(candidate => candidate.id === record.employeeId);
      items.push({
        reminderType: "registration_expiry",
        entityType: "professional_registration",
        entityId: record.id,
        title: `Registration reminder: ${employee ? employeeName(employee) : `Employee ${record.employeeId}`}`,
        content: `${record.bodyName} registration ${status === "expired" ? "expired" : "expires soon"} on ${record.annualExpiryDate}.`,
        sentAt: new Date(),
      });
    }
  }

  for (const request of store.leaveRequests.filter(candidate => candidate.status === "pending" && employeeIds.has(candidate.employeeId))) {
    if (!reminderRecentlySent(store, "leave_approval", "leave_request", request.id)) {
      const employee = store.employees.find(candidate => candidate.id === request.employeeId);
      items.push({
        reminderType: "leave_approval",
        entityType: "leave_request",
        entityId: request.id,
        title: `Pending leave approval: ${employee ? employeeName(employee) : `Employee ${request.employeeId}`}`,
        content: `${request.daysRequested} day ${request.leaveType} request awaits approval from ${request.startDate} to ${request.endDate}.`,
        sentAt: new Date(),
      });
    }
  }

  return items;
}

export async function listComplianceForUser(user: AuthenticatedAppUser) {
  const store = await getStore();
  const visibleEmployees = new Set(scopedEmployeesFromStore(user, store).map(employee => employee.id));
  const items = buildComplianceItems(store, visibleEmployees);
  const reminders = store.reminderActivities.slice(0, 10);

  return clone({
    summary: {
      openItems: items.filter(item => item.currentState === "open").length,
      resolvedItems: items.filter(item => item.currentState === "resolved").length,
      replacementRequested: items.filter(item => item.currentState === "replacement_requested").length,
      renewalInProgress: items.filter(item => item.currentState === "renewal_in_progress").length,
    },
    items,
    reminders,
  });
}

export async function takeComplianceActionForUser(
  user: AuthenticatedAppUser,
  input: {
    entityType: Exclude<ComplianceEntity, "leave_request">;
    entityId: number;
    state: ComplianceState;
    note?: string | null;
  },
) {
  if (await hrTablesAreReady()) {
    const db = await getDb();
    if (!db) return null;

    if (input.entityType === "document") {
      const existing = (await db.select().from(documents).where(eq(documents.id, input.entityId)).limit(1))[0];
      if (!existing) return null;
      if (input.state === "renewal_in_progress") {
        await db.update(documents).set({
          expiryDate: toDateInput(addDays(existing.expiryDate ? toDateOnly(existing.expiryDate) : null, 365)),
          status: "valid",
          updatedAt: new Date(),
        }).where(eq(documents.id, input.entityId));
      }
    }

    if (input.entityType === "professional_registration") {
      const existing = (await db.select().from(professionalRegistrations).where(eq(professionalRegistrations.id, input.entityId)).limit(1))[0];
      if (!existing) return null;
      if (input.state === "renewal_in_progress") {
        await db.update(professionalRegistrations).set({
          annualExpiryDate: toDateInput(addDays(toDateOnly(existing.annualExpiryDate), 365))!,
          status: "valid",
          updatedAt: new Date(),
        }).where(eq(professionalRegistrations.id, input.entityId));
      }
    }

    if (input.entityType === "contract") {
      const existing = (await db.select().from(contracts).where(eq(contracts.id, input.entityId)).limit(1))[0];
      if (!existing) return null;
      if (input.state === "renewal_in_progress") {
        await db.update(contracts).set({
          endDate: toDateInput(addDays(existing.endDate ? toDateOnly(existing.endDate) : null, 365)),
          reviewDate: toDateInput(addDays(existing.reviewDate ? toDateOnly(existing.reviewDate) : null, 90)),
          status: "active",
          updatedAt: new Date(),
        }).where(eq(contracts.id, input.entityId));
      }
    }
  } else {
    if (input.entityType === "document") {
      const existing = documentSeed.find(candidate => candidate.id === input.entityId);
      if (!existing) return null;
      if (input.state === "renewal_in_progress") {
        existing.expiryDate = addDays(existing.expiryDate, 365);
        existing.status = "valid";
        existing.updatedAt = new Date();
      }
    }

    if (input.entityType === "professional_registration") {
      const existing = professionalRegistrationSeed.find(candidate => candidate.id === input.entityId);
      if (!existing) return null;
      if (input.state === "renewal_in_progress") {
        existing.annualExpiryDate = addDays(existing.annualExpiryDate, 365);
        existing.status = "valid";
        existing.updatedAt = new Date();
      }
    }

    if (input.entityType === "contract") {
      const existing = contractSeed.find(candidate => candidate.id === input.entityId);
      if (!existing) return null;
      if (input.state === "renewal_in_progress") {
        existing.endDate = addDays(existing.endDate, 365);
        existing.reviewDate = addDays(existing.reviewDate, 90);
        existing.status = "active";
        existing.updatedAt = new Date();
      }
    }
  }

  const action = await insertComplianceActionRecord(user, input.entityType, input.entityId, input.state, input.note ?? null);
  await appendAudit(user, input.entityType, String(input.entityId), `compliance.${input.state}`, {
    state: input.state,
    note: input.note ?? null,
  });

  const store = await getStore();
  const visibleEmployees = new Set(scopedEmployeesFromStore(user, store).map(employee => employee.id));
  const item = buildComplianceItems(store, visibleEmployees).find(
    candidate => candidate.entityType === input.entityType && candidate.entityId === input.entityId,
  );

  return clone({ action, item: item ?? null });
}

export async function submitPilotFeedbackRecord(
  user: AuthenticatedAppUser,
  input: PilotFeedbackInput,
): Promise<{ success: true; delivered: boolean; auditEntryId: string }> {
  const submittedAt = new Date();
  const entityId = `feedback-${submittedAt.getTime()}`;
  const auditEntry = await appendAudit(user, "pilot_feedback", entityId, "pilot.feedback_submitted", {
    screen: input.screen,
    currentRoute: input.currentRoute,
    summary: input.summary,
    details: input.details,
    submittedAt: submittedAt.toISOString(),
  });

  const delivered = await notifyOwner({
    title: `Pilot feedback · ${input.screen} · ${user.role}`,
    content: [
      `Submitted by: ${user.name ?? user.email ?? "Unknown user"}`,
      `Role: ${user.role}`,
      `Route: ${input.currentRoute}`,
      `Summary: ${input.summary}`,
      "",
      "Details:",
      input.details,
    ].join("\n"),
  });

  return {
    success: true,
    delivered,
    auditEntryId: String(auditEntry.id),
  };
}

export async function sendComplianceReminderDigest(user: AuthenticatedAppUser): Promise<ReminderDigestResult> {
  const store = await getStore();
  const visibleEmployees = new Set(scopedEmployeesFromStore(user, store).map(employee => employee.id));
  const dueEntries = buildDueReminderEntries(store, visibleEmployees);

  if (dueEntries.length === 0) {
    return { sent: false, reminderCount: 0, summary: "No new reminders were due.", sentAt: null, reminderTypes: [] };
  }

  const summaryLines = dueEntries.slice(0, 8).map(entry => `- ${entry.title}: ${entry.content}`);
  const content = `HR reminder digest\n\n${summaryLines.join("\n")}`;
  const notified = await notifyOwner({
    title: `HR reminder digest (${dueEntries.length})`,
    content,
  });

  if (!notified) {
    return {
      sent: false,
      reminderCount: dueEntries.length,
      summary: "Reminder digest could not be delivered right now.",
      sentAt: null,
      reminderTypes: Array.from(new Set(dueEntries.map(entry => entry.reminderType))),
    };
  }

  const created = await insertReminderActivityRecords(dueEntries);
  await appendAudit(user, "reminder_digest", String(created[0]?.id ?? Date.now()), "reminder.digest.sent", {
    reminderCount: created.length,
    reminderTypes: Array.from(new Set(created.map(entry => entry.reminderType))),
  });
  return {
    sent: true,
    reminderCount: created.length,
    summary: `Delivered ${created.length} reminder${created.length === 1 ? "" : "s"} to the project owner.`,
    sentAt: created[0]?.sentAt ?? new Date(),
    reminderTypes: Array.from(new Set(created.map(entry => entry.reminderType))),
  };
}
