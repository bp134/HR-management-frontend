import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { AppRole } from "../drizzle/schema";
import { complianceWorkflowStates, documentCategories } from "../shared/hr";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  approveLeaveRequestRecord,
  archiveDepartmentRecord,
  archiveEmployeeRecord,
  AuthenticatedAppUser,
  createContractRecord,
  createDepartmentRecord,
  createEmployeeRecord,
  createLeaveRequestRecord,
  createProfessionalRegistrationRecord,
  describeAuditStoragePolicy,
  exportEmployeesCsvForUser,
  importEmployeesFromCsvForUser,
  listComplianceForUser,
  EmployeeFilters,
  getEmployeeDetailForUser,
  getHrOverview,
  listAuditLogsForUser,
  listContractsForUser,
  listDepartments,
  listDocumentsForUser,
  sendComplianceReminderDigest,
  listEmployeesForUser,
  listLeaveForUser,
  listProfessionalRegistrationsForUser,
  listUserAdminRecords,
  submitPilotFeedbackRecord,
  takeComplianceActionForUser,
  updateContractRecord,
  updateDepartmentRecord,
  updateUserRoleRecord,
  uploadDocumentRecord,
} from "./db";

const appRoles = ["admin", "hr", "manager", "employee"] as const;
const employmentStatuses = ["active", "on_leave", "probation", "archived"] as const;
const contractTypes = ["permanent", "fixed_term", "temporary", "contractor"] as const;
const contractStatuses = ["draft", "active", "ending_soon", "expired", "superseded"] as const;
const leaveTypes = ["annual", "sick", "unpaid", "other"] as const;

function assertAllowedRole(user: AuthenticatedAppUser, allowed: readonly AppRole[]) {
  if (!allowed.includes(user.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Role ${user.role} cannot perform this action.`,
    });
  }
}

function roleProcedure(allowed: readonly AppRole[]) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    assertAllowedRole(ctx.user, allowed);
    return next({ ctx });
  });
}

const employeeFilterSchema = z.object({
  search: z.string().optional(),
  departmentId: z.number().nullable().optional(),
  status: z.enum(employmentStatuses).nullable().optional(),
  managerId: z.number().nullable().optional(),
  page: z.number().min(1).optional(),
  pageSize: z.number().min(1).max(25).optional(),
});

const employeeWizardSchema = z.object({
  personal: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    dateOfBirth: z.string().min(1),
    niNumber: z.string().min(1),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    postcode: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email(),
  }),
  employment: z.object({
    employeeNumber: z.string().min(1),
    departmentId: z.number().min(1),
    jobTitle: z.string().min(1),
    managerId: z.number().nullable().optional(),
    employmentStatus: z.enum(employmentStatuses),
    startDate: z.string().min(1),
  }),
  contract: z.object({
    contractType: z.enum(contractTypes),
    salaryBasis: z.string().min(1),
    salaryAmount: z.number().min(0),
    hoursPerWeek: z.number().min(1).max(60),
    startDate: z.string().min(1),
    endDate: z.string().nullable().optional(),
    probationEndDate: z.string().nullable().optional(),
  }),
  documents: z.array(
    z.object({
      category: z.enum(documentCategories),
      name: z.string().min(1),
      expiryDate: z.string().nullable().optional(),
    }),
  ),
});

const departmentInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(2).max(8),
  managerName: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

const departmentUpdateSchema = departmentInputSchema.extend({
  departmentId: z.number().min(1),
});

const contractInputSchema = z.object({
  employeeId: z.number().min(1),
  contractType: z.enum(contractTypes),
  status: z.enum(contractStatuses),
  salaryBasis: z.string().min(1),
  salaryAmount: z.number().min(0),
  hoursPerWeek: z.number().min(1).max(60),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  probationEndDate: z.string().nullable().optional(),
  reviewDate: z.string().nullable().optional(),
});

const contractUpdateSchema = contractInputSchema.extend({
  contractId: z.number().min(1),
});

const documentInputSchema = z.object({
  employeeId: z.number().min(1),
  category: z.enum(documentCategories),
  name: z.string().min(1),
  expiryDate: z.string().nullable().optional(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileDataBase64: z.string().min(1),
});

const userRoleUpdateSchema = z.object({
  userId: z.number().min(1),
  role: z.enum(appRoles),
});

const leaveRequestSchema = z.object({
  employeeId: z.number().min(1),
  leaveType: z.enum(leaveTypes),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  daysRequested: z.number().min(1).max(60),
  notes: z.string().optional(),
});

const professionalRegistrationSchema = z.object({
  employeeId: z.number().min(1),
  bodyName: z.string().min(1),
  registrationNumber: z.string().min(1),
  annualExpiryDate: z.string().min(1),
  reminderDays: z.number().min(1).max(120),
});

const bulkEmployeeCsvSchema = z.object({
  csvText: z.string().min(1),
});

const employeeCsvExportSchema = z.object({
  search: z.string().optional(),
  departmentId: z.number().nullable().optional(),
  status: z.enum(employmentStatuses).nullable().optional(),
  managerId: z.number().nullable().optional(),
});

const complianceActionSchema = z.object({
  entityType: z.enum(["contract", "document", "professional_registration"]),
  entityId: z.number().min(1),
  state: z.enum(complianceWorkflowStates),
  note: z.string().max(500).optional(),
});

const pilotFeedbackSchema = z.object({
  screen: z.string().min(1).max(80),
  currentRoute: z.string().min(1).max(200),
  summary: z.string().min(3).max(160),
  details: z.string().min(10).max(4000),
});

const hrRouter = router({
  permissions: protectedProcedure.query(({ ctx }) => ({
    role: ctx.user.role,
    allowedRoles: appRoles,
    canManageEmployees: ctx.user.role === "admin" || ctx.user.role === "hr",
    canManageCompliance: ctx.user.role === "admin" || ctx.user.role === "hr",
    canApproveLeave: ctx.user.role === "admin" || ctx.user.role === "hr" || ctx.user.role === "manager",
    canRequestLeave: ctx.user.role === "admin" || ctx.user.role === "hr" || ctx.user.role === "manager" || ctx.user.role === "employee",
    canViewAudit: ctx.user.role === "admin" || ctx.user.role === "hr",
  })),
  dashboard: protectedProcedure.query(({ ctx }) => getHrOverview(ctx.user)),
  employees: router({
    list: protectedProcedure.input(employeeFilterSchema.optional()).query(({ ctx, input }) =>
      listEmployeesForUser(ctx.user, (input ?? {}) as EmployeeFilters),
    ),
    detail: protectedProcedure.input(z.object({ employeeId: z.number().min(1) })).query(({ ctx, input }) =>
      getEmployeeDetailForUser(ctx.user, input.employeeId),
    ),
    create: roleProcedure(["admin", "hr"]).input(employeeWizardSchema).mutation(({ ctx, input }) =>
      createEmployeeRecord(ctx.user, input),
    ),
    exportCsv: roleProcedure(["admin", "hr"]).input(employeeCsvExportSchema.optional()).mutation(({ ctx, input }) =>
      exportEmployeesCsvForUser(ctx.user, {
        search: input?.search,
        departmentId: input?.departmentId ?? null,
        status: input?.status ?? null,
        managerId: input?.managerId ?? null,
      }),
    ),
    importCsv: roleProcedure(["admin", "hr"]).input(bulkEmployeeCsvSchema).mutation(({ ctx, input }) =>
      importEmployeesFromCsvForUser(ctx.user, input.csvText),
    ),
    archive: roleProcedure(["admin", "hr"]).input(z.object({ employeeId: z.number().min(1) })).mutation(({ ctx, input }) =>
      archiveEmployeeRecord(ctx.user, input.employeeId),
    ),
  }),
  departments: router({
    list: protectedProcedure.query(() => listDepartments()),
    create: roleProcedure(["admin", "hr"]).input(departmentInputSchema).mutation(({ ctx, input }) =>
      createDepartmentRecord(ctx.user, input),
    ),
    update: roleProcedure(["admin", "hr"]).input(departmentUpdateSchema).mutation(({ ctx, input }) =>
      updateDepartmentRecord(ctx.user, input),
    ),
    archive: roleProcedure(["admin", "hr"]).input(z.object({ departmentId: z.number().min(1) })).mutation(({ ctx, input }) =>
      archiveDepartmentRecord(ctx.user, input.departmentId),
    ),
  }),
  contracts: router({
    list: protectedProcedure.query(({ ctx }) => listContractsForUser(ctx.user)),
    create: roleProcedure(["admin", "hr"]).input(contractInputSchema).mutation(({ ctx, input }) =>
      createContractRecord(ctx.user, input),
    ),
    update: roleProcedure(["admin", "hr"]).input(contractUpdateSchema).mutation(({ ctx, input }) =>
      updateContractRecord(ctx.user, input),
    ),
  }),
  documents: router({
    list: roleProcedure(["admin", "hr"]).query(({ ctx }) => listDocumentsForUser(ctx.user)),
    upload: roleProcedure(["admin", "hr"]).input(documentInputSchema).mutation(({ ctx, input }) =>
      uploadDocumentRecord(ctx.user, input),
    ),
  }),
  leave: router({
    list: protectedProcedure.query(({ ctx }) => listLeaveForUser(ctx.user)),
    create: roleProcedure(["admin", "hr", "manager", "employee"]).input(leaveRequestSchema).mutation(({ ctx, input }) =>
      createLeaveRequestRecord(ctx.user, input),
    ),
    approve: roleProcedure(["admin", "hr", "manager"]).input(z.object({ requestId: z.number().min(1) })).mutation(({ ctx, input }) =>
      approveLeaveRequestRecord(ctx.user, input.requestId),
    ),
  }),
  registrations: router({
    list: protectedProcedure.query(({ ctx }) => listProfessionalRegistrationsForUser(ctx.user)),
    create: roleProcedure(["admin", "hr"]).input(professionalRegistrationSchema).mutation(({ ctx, input }) =>
      createProfessionalRegistrationRecord(ctx.user, input),
    ),
  }),
  access: router({
    users: roleProcedure(["admin"]).query(() => listUserAdminRecords()),
    updateRole: roleProcedure(["admin"]).input(userRoleUpdateSchema).mutation(({ ctx, input }) =>
      updateUserRoleRecord(ctx.user, input),
    ),
  }),
  audit: router({
    list: roleProcedure(["admin", "hr"]).query(() => listAuditLogsForUser()),
    storagePolicy: roleProcedure(["admin", "hr"]).query(() => describeAuditStoragePolicy()),
  }),
  compliance: router({
    list: roleProcedure(["admin", "hr"]).query(({ ctx }) => listComplianceForUser(ctx.user)),
    takeAction: roleProcedure(["admin", "hr"]).input(complianceActionSchema).mutation(({ ctx, input }) =>
      takeComplianceActionForUser(ctx.user, input),
    ),
    sendReminders: roleProcedure(["admin", "hr"]).mutation(({ ctx }) => sendComplianceReminderDigest(ctx.user)),
  }),
  feedback: router({
    submit: roleProcedure(["admin", "hr", "manager", "employee"]).input(pilotFeedbackSchema).mutation(({ ctx, input }) =>
      submitPilotFeedbackRecord(ctx.user, input),
    ),
  }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  hr: hrRouter,
});

export type AppRouter = typeof appRouter;
