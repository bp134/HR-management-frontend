export const documentCategories = [
  "contract",
  "id",
  "visa",
  "qualification",
  "professional_registration",
] as const;

export type DocumentCategory = (typeof documentCategories)[number];

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  contract: "Contract",
  id: "ID",
  visa: "Visa",
  qualification: "Qualification",
  professional_registration: "Professional Registration",
};

export const complianceEntityTypes = [
  "contract",
  "document",
  "professional_registration",
  "leave_request",
] as const;

export type ComplianceEntityType = (typeof complianceEntityTypes)[number];

export const complianceWorkflowStates = [
  "open",
  "reviewed",
  "replacement_requested",
  "renewal_in_progress",
  "resolved",
] as const;

export type ComplianceWorkflowState = (typeof complianceWorkflowStates)[number];

export const complianceWorkflowLabels: Record<ComplianceWorkflowState, string> = {
  open: "Open",
  reviewed: "Reviewed",
  replacement_requested: "Replacement Requested",
  renewal_in_progress: "Renewal In Progress",
  resolved: "Resolved",
};

export const reminderTypes = [
  "contract_expiry",
  "document_expiry",
  "registration_expiry",
  "leave_approval",
] as const;

export type ReminderType = (typeof reminderTypes)[number];

export const reminderTypeLabels: Record<ReminderType, string> = {
  contract_expiry: "Contract expiry reminder",
  document_expiry: "Document expiry reminder",
  registration_expiry: "Professional registration reminder",
  leave_approval: "Pending leave approval reminder",
};

export const requiredBulkEmployeeCsvHeaders = [
  "employeeNumber",
  "firstName",
  "lastName",
  "email",
  "phone",
  "dateOfBirth",
  "niNumber",
  "addressLine1",
  "addressLine2",
  "city",
  "postcode",
  "departmentId",
  "managerId",
  "jobTitle",
  "employmentStatus",
  "startDate",
  "contractType",
  "salaryBasis",
  "salaryAmount",
  "hoursPerWeek",
  "contractEndDate",
  "probationEndDate",
  "documentCategory",
  "documentName",
  "documentExpiryDate",
] as const;

export const bulkEmployeeCsvLookupHeaders = [
  "departmentCode",
  "departmentName",
  "managerEmployeeNumber",
  "managerEmail",
] as const;

export const bulkEmployeeCsvHeaders = [
  ...requiredBulkEmployeeCsvHeaders,
  ...bulkEmployeeCsvLookupHeaders,
] as const;

export type BulkEmployeeCsvHeader = (typeof bulkEmployeeCsvHeaders)[number];
export type RequiredBulkEmployeeCsvHeader = (typeof requiredBulkEmployeeCsvHeaders)[number];
export type BulkEmployeeCsvLookupHeader = (typeof bulkEmployeeCsvLookupHeaders)[number];
