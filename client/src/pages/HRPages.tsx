import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  bulkEmployeeCsvHeaders,
  complianceWorkflowLabels,
  documentCategoryLabels,
  reminderTypeLabels,
  type ComplianceWorkflowState,
  type DocumentCategory,
} from "@shared/hr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Download,
  FileClock,
  FileLock2,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  Users2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type Role = "admin" | "hr" | "manager" | "employee";

const securedDocumentCategories: DocumentCategory[] = [
  "contract",
  "id",
  "visa",
  "qualification",
  "professional_registration",
];

type RouteParams = {
  params: {
    id: string;
  };
};

const roleLabels: Record<Role, string> = {
  admin: "Administrator",
  hr: "HR",
  manager: "Manager",
  employee: "Employee",
};

const pilotQuickStartByRole: Record<Role, string> = {
  admin: "Start on the dashboard, review compliance risk, then use the employee workspace for CSV import or export and the access screen for role administration.",
  hr: "Start on the dashboard, use Employees for onboarding or CSV administration, then work through Compliance and Documents for any records nearing expiry.",
  manager: "Start on the dashboard to confirm team scope, review employee records for your direct reports, and clear pending leave from the approval queue.",
  employee: "Start on the dashboard to confirm your self-service scope, review your employee record, and use Leave to submit requests or check existing approvals.",
};

const validHumanFriendlyCsvSample = `${bulkEmployeeCsvHeaders.join(",")}\nEMP-HUMAN-CSV-002,Taylor,Verifier,taylor.verifier+csv2@northstar.test,+44 7700 999002,1990-06-22,QQ123457D,21 Mapping Street,,Leeds,LS1 4AC,,,HR Analyst,active,2026-04-16,permanent,annual,43000,37.5,,,id,Passport,2030-06-22,,People Operations,,alice.morgan@northstar.test\n`;

const pilotRoleFlows: Array<{ role: Role; route: string; focus: string }> = [
  { role: "admin", route: "/employees?impersonate=off", focus: "Confirm CSV administration, access control management, and full operational navigation." },
  { role: "hr", route: "/compliance?impersonate=off", focus: "Review the compliance queue, reminder activity, and document lifecycle follow-up workflows." },
  { role: "manager", route: "/leave?impersonate=manager", focus: "Approve pending leave for direct reports and verify that navigation is limited to scoped operational areas." },
  { role: "employee", route: "/leave?impersonate=employee", focus: "Submit self-service leave requests and confirm that privileged actions remain hidden." },
];

const downloadablePilotPacks: Array<{ title: string; fileName: string; description: string; content: string }> = [
  {
    title: "Human-friendly employee CSV sample",
    fileName: "pilot-human-friendly-employee-import.csv",
    description: "Uses department name and manager email so testers can validate bulk import without raw internal IDs.",
    content: validHumanFriendlyCsvSample,
  },
  {
    title: "Leave scenario pack",
    fileName: "pilot-leave-scenarios.md",
    description: "Covers employee submission, manager approval, and expected scoped visibility during the pilot.",
    content: `# Leave Scenario Pack\n\n## Primary route\n- Employee: /leave?impersonate=employee\n- Manager: /leave?impersonate=manager\n\n## Test flow\n1. Submit a leave request as the employee role with realistic dates and notes.\n2. Switch to the manager role and confirm the request appears in the approval queue.\n3. Approve the request and verify the status updates without exposing other employees outside scope.\n\n## Expected result\nThe employee can create requests but cannot approve them. The manager can approve scoped requests and should not see restricted admin-only areas.\n`,
  },
  {
    title: "Compliance scenario pack",
    fileName: "pilot-compliance-scenarios.md",
    description: "Focuses on reviewed, renewal-in-progress, replacement-requested, and resolved compliance actions.",
    content: `# Compliance Scenario Pack\n\n## Primary route\n- Admin or HR: /compliance?impersonate=off\n\n## Test flow\n1. Review the highest-severity items in the action queue.\n2. Move one item to Reviewed, one to Renewal in progress, and one to Replacement requested.\n3. Resolve a completed item and confirm the page summary still reflects the remaining workload.\n4. Trigger the reminder digest only after confirming the queue state.\n\n## Expected result\nEach workflow action should persist, remain auditable, and preserve an ordered operational queue for follow-up.\n`,
  },
  {
    title: "Document-expiry scenario pack",
    fileName: "pilot-document-expiry-scenarios.md",
    description: "Guides testers through document and registration expiry checks tied to the compliance workspace.",
    content: `# Document Expiry Scenario Pack\n\n## Primary routes\n- Documents: /documents?impersonate=off\n- Compliance: /compliance?impersonate=off\n\n## Test flow\n1. Review secured document categories for expiring ID, visa, qualification, or professional registration records.\n2. Confirm expiring records surface in the compliance workspace with actionable status labels.\n3. Update the workflow state from open to a follow-up state and verify reminder activity remains available.\n\n## Expected result\nExpiring document obligations should stay visible in both operational review and compliance follow-up contexts without exposing unrestricted raw storage access.\n`,
  },
];

type PersonaChecklistScreen = "dashboard" | "employees" | "leave" | "compliance";

const personaChecklistConfig: Record<PersonaChecklistScreen, {
  screenLabel: string;
  defaultRoute: string;
  focusByRole: Record<Role, string[]>;
}> = {
  dashboard: {
    screenLabel: "Dashboard",
    defaultRoute: "/?impersonate=off",
    focusByRole: {
      admin: [
        "Confirm the headcount, pending approvals, missing documents, and contract-expiry metrics load without exposing any restricted route warnings.",
        "Open the quick-start guidance, then move into Employees and Access from the same session to confirm the dashboard is still the right admin launch point.",
        "Record any missing alert cards or stale metrics before continuing into operational flows.",
      ],
      hr: [
        "Confirm the operational metrics and compliance alerts render for the HR scope without showing admin-only access controls.",
        "Use the dashboard as the launch point into Employees, Documents, and Compliance while keeping the quick-start guidance visible.",
        "Capture any mismatch between dashboard alerts and downstream compliance queues.",
      ],
      manager: [
        "Confirm the dashboard only shows team-scoped summary information and not admin-only areas such as Access or Compliance.",
        "Use the dashboard to launch into Employees and Leave, then return to verify the scoped navigation remains intact.",
        "Record any direct-report counts or pending approvals that do not match the manager queue.",
      ],
      employee: [
        "Confirm the dashboard stays self-service scoped and does not expose privileged administration links.",
        "Use the dashboard to open your employee profile and Leave workspace from the same role session.",
        "Note any missing self-service metrics or unexpected alerts before continuing.",
      ],
    },
  },
  employees: {
    screenLabel: "Employees",
    defaultRoute: "/employees?impersonate=off",
    focusByRole: {
      admin: [
        "Run a CSV export from the current scope and confirm the download succeeds with a matching success toast.",
        "Import the human-friendly sample using department name and manager email, then review the persistent import summary and any row-error download.",
        "Open the recent bulk activity panel and confirm both CSV actions appear with audit references.",
      ],
      hr: [
        "Confirm the employee list, filters, and CSV workspace load for the HR role without exposing Access.",
        "Use the human-friendly import sample to validate batch administration and then review the persistent import summary.",
        "Check that recent bulk activity reflects the latest CSV actions and can support follow-up review.",
      ],
      manager: [
        "Confirm the employee list is limited to direct-report scope and that bulk administration controls remain unavailable.",
        "Open one employee record from the visible team scope and verify restricted actions remain hidden.",
        "Record any unexpected exposure of CSV administration or unrestricted employee detail.",
      ],
      employee: [
        "Confirm the employee area only shows the self-service record and blocks broader list administration.",
        "Verify privileged actions such as CSV import, export, and record creation are not available.",
        "Capture any route or table state that suggests broader visibility than self-service should allow.",
      ],
    },
  },
  leave: {
    screenLabel: "Leave",
    defaultRoute: "/leave?impersonate=employee",
    focusByRole: {
      admin: [
        "Confirm the leave overview includes both request-entry capability and a visible approval queue for operational recovery scenarios.",
        "Approve one pending request only after verifying the employee name, dates, and request type are correct.",
        "Review the resulting status update and confirm the action remains suitable for later audit review.",
      ],
      hr: [
        "Submit or review a leave request and confirm the queue updates without exposing manager-only assumptions.",
        "Check that the leave list reflects the latest workflow state after each action.",
        "Capture any mismatch between approval status, queue counts, and dashboard metrics.",
      ],
      manager: [
        "Confirm the leave queue only contains requests for direct reports within your scope.",
        "Approve a pending scoped request and verify the success message and updated status render in the same session.",
        "Record any request that appears outside the expected team boundary.",
      ],
      employee: [
        "Confirm you can create a self-service leave request but cannot see approval controls.",
        "Review your own request history after submission to ensure the new request stays visible and correctly scoped.",
        "Capture any unexpected access to another employee's leave information.",
      ],
    },
  },
  compliance: {
    screenLabel: "Compliance",
    defaultRoute: "/compliance?impersonate=off",
    focusByRole: {
      admin: [
        "Review the highest-severity action queue item first and move one record to Reviewed.",
        "Confirm the queue, summary metrics, and reminder activity remain consistent after the workflow transition.",
        "Record any item whose due date, severity, or workflow state does not align with the visible contract or document risk.",
      ],
      hr: [
        "Work through one compliance item from the action queue and confirm the state change persists after refresh.",
        "Check reminder activity and summary metrics after the workflow transition.",
        "Capture any document or registration item that appears missing from the compliance queue.",
      ],
      manager: [
        "This route should not be available to managers during the pilot; note any unexpected access immediately.",
        "If you reach this screen, capture the full route and visible actions for triage.",
        "Do not proceed with compliance changes from the manager role.",
      ],
      employee: [
        "This route should not be available to employees during the pilot; note any unexpected access immediately.",
        "If you reach this screen, capture the full route and visible actions for triage.",
        "Do not proceed with compliance changes from the employee role.",
      ],
    },
  },
};

function buildChecklistMarkdown(role: Role, screen: PersonaChecklistScreen) {
  const config = personaChecklistConfig[screen];
  const checks = config.focusByRole[role]
    .map((item, index) => `${index + 1}. ${item}`)
    .join("\n");

  return `# ${roleLabels[role]} ${config.screenLabel} Checklist\n\n## Route\n- ${config.defaultRoute}\n\n## Validation steps\n${checks}\n`;
}

function statusTone(status: string) {
  switch (status) {
    case "active":
    case "approved":
    case "valid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "ending_soon":
    case "expiring":
    case "pending":
    case "probation":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "archived":
    case "expired":
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function parseAuditChangedFields(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</CardTitle>
        </div>
        <div className="rounded-2xl bg-slate-950 p-3 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function PageIntro({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff,rgba(245,247,255,0.92))] p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function PilotGuidance({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-violet-200/80 bg-violet-50/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base text-violet-950">{title}</CardTitle>
        <CardDescription className="text-violet-800">Keep this checklist visible while running the internal pilot.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-6 text-violet-950">{children}</CardContent>
    </Card>
  );
}

function downloadTextFile(fileName: string, content: string, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
}

function PilotSupportPanel({
  role,
  screen,
  extraPackFileNames = [],
}: {
  role: Role;
  screen: PersonaChecklistScreen;
  extraPackFileNames?: string[];
}) {
  const config = personaChecklistConfig[screen];
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const feedback = trpc.hr.feedback.submit.useMutation({
    onSuccess: result => {
      toast.success(result.delivered ? "Pilot feedback submitted and owner notified." : "Pilot feedback submitted for review.");
      setSummary("");
      setDetails("");
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const checklistFileName = `${role}-pilot-${screen}-checklist.md`;
  const checklistContent = buildChecklistMarkdown(role, screen);
  const additionalPacks = downloadablePilotPacks.filter(pack => extraPackFileNames.includes(pack.fileName));
  const currentRoute = typeof window === "undefined"
    ? config.defaultRoute
    : `${window.location.pathname}${window.location.search}`;

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm">
      <CardHeader>
        <CardTitle>{config.screenLabel} pilot support</CardTitle>
        <CardDescription>Download the role-specific checklist for this workspace and send structured pilot feedback without leaving the current screen.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-medium text-slate-900">{roleLabels[role]} checklist</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Use the download below to keep the expected route, workflow scope, and validation steps visible while you test this screen.</p>
            <Button className="mt-4 rounded-2xl" variant="outline" onClick={() => downloadTextFile(checklistFileName, checklistContent, "text/markdown;charset=utf-8")}>
              <FileText className="mr-2 h-4 w-4" />
              Download {roleLabels[role]} checklist
            </Button>
          </div>
          {additionalPacks.length ? (
            <div className="grid gap-3">
              {additionalPacks.map(pack => (
                <div key={pack.fileName} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-900">{pack.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{pack.description}</p>
                  <Button
                    className="mt-4 rounded-2xl"
                    variant="outline"
                    onClick={() => downloadTextFile(pack.fileName, pack.content, pack.fileName.endsWith(".csv") ? "text/csv;charset=utf-8" : "text/markdown;charset=utf-8")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download scenario file
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
          <div>
            <p className="font-medium text-slate-900">Send pilot feedback</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Each submission records the current role and route so follow-up can start from the exact workflow context that produced the issue.</p>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
            Capturing feedback as <strong className="text-slate-900">{roleLabels[role]}</strong> on <strong className="text-slate-900">{currentRoute}</strong>.
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${screen}-feedback-summary`}>Feedback summary</Label>
            <Input
              id={`${screen}-feedback-summary`}
              value={summary}
              onChange={event => setSummary(event.target.value)}
              placeholder="Short title for the issue or observation"
              maxLength={160}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${screen}-feedback-details`}>What happened?</Label>
            <Textarea
              id={`${screen}-feedback-details`}
              value={details}
              onChange={event => setDetails(event.target.value)}
              rows={5}
              placeholder="Describe what you expected, what happened instead, and any steps another tester can follow to reproduce it."
            />
          </div>
          <Button
            className="rounded-2xl"
            onClick={() => feedback.mutate({
              screen: config.screenLabel,
              currentRoute,
              summary: summary.trim(),
              details: details.trim(),
            })}
            disabled={feedback.isPending || summary.trim().length < 3 || details.trim().length < 10}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {feedback.isPending ? "Submitting..." : "Send pilot feedback"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const dashboard = trpc.hr.dashboard.useQuery();
  const permissions = trpc.hr.permissions.useQuery();
  const role = (permissions.data?.role ?? "employee") as Role;

  return (
    <div className="space-y-6">
      <PageIntro
        title={`${roleLabels[role]} dashboard`}
        description="The dashboard surfaces operational priorities for the signed-in role, including pending leave approvals, expiring contracts, document gaps, and compliance alerts."
      />

      <PilotGuidance title="Pilot quick start">
        <p>{pilotQuickStartByRole[role]}</p>
        <p>Use the sidebar to confirm which areas are available for your role. During the pilot, missing navigation items usually indicate that access is being scoped correctly rather than a page failing to load.</p>
      </PilotGuidance>

      <PilotSupportPanel role={role} screen="dashboard" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Headcount" value={dashboard.data?.headcount ?? 0} description="Visible employees within this role's permitted scope." icon={Users2} />
        <MetricCard title="Pending approvals" value={dashboard.data?.pendingApprovals ?? 0} description="Leave approvals currently awaiting action." icon={CalendarDays} />
        <MetricCard title="Missing documents" value={dashboard.data?.missingDocuments ?? 0} description="Employees who still need mandatory documents." icon={FileLock2} />
        <MetricCard title="Contracts ending soon" value={dashboard.data?.contractsEndingSoon ?? 0} description="Contracts due to expire within the proactive alert window." icon={FileClock} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Team summary</CardTitle>
            <CardDescription>Visible employee records are tailored to the current role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.data?.teamSummary?.map(member => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-900">{member.name}</p>
                  <p className="text-sm text-slate-500">{member.department}</p>
                </div>
                <Badge className={statusTone(member.status)}>{member.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Compliance alerts</CardTitle>
            <CardDescription>Alerts are generated proactively before expiry milestones are reached.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.data?.alerts?.map((alert, index) => (
              <div key={`${alert.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <CircleAlert className="mt-0.5 h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-slate-900">{alert.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{alert.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function EmployeesPage() {
  const utils = trpc.useUtils();
  const permissions = trpc.hr.permissions.useQuery();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("all");
  const [status, setStatus] = useState("all");
  const [managerId, setManagerId] = useState("all");
  const [page, setPage] = useState(1);
  const [csvDraft, setCsvDraft] = useState("");
  const [selectedCsvFileName, setSelectedCsvFileName] = useState<string | null>(null);
  const [bulkImportErrors, setBulkImportErrors] = useState<Array<{ rowNumber: number; employeeNumber: string | null; message: string }>>([]);
  const [bulkImportSummary, setBulkImportSummary] = useState<null | {
    createdCount: number;
    errorCount: number;
    importedEmployeeNumbers: string[];
    errorReportFileName: string | null;
    errorReportCsv: string | null;
    auditEntryId: string;
  }>(null);

  const csvTemplate = useMemo(() => `${bulkEmployeeCsvHeaders.join(",")}\n`, []);

  const queryInput = useMemo(
    () => ({
      search,
      departmentId: departmentId === "all" ? null : Number(departmentId),
      status: status === "all" ? null : (status as "active" | "on_leave" | "probation" | "archived"),
      managerId: managerId === "all" ? null : Number(managerId),
      page,
      pageSize: 8,
    }),
    [departmentId, managerId, page, search, status],
  );

  const employees = trpc.hr.employees.list.useQuery(queryInput);
  const bulkAudit = trpc.hr.audit.list.useQuery(undefined, {
    enabled: Boolean(permissions.data?.canViewAudit),
  });
  const recentBulkActivity = useMemo(
    () =>
      (bulkAudit.data ?? [])
        .filter(entry => entry.action === "employee.bulk_exported" || entry.action === "employee.bulk_imported")
        .slice(0, 6)
        .map(entry => ({
          ...entry,
          details: parseAuditChangedFields(entry.changedFields),
        })),
    [bulkAudit.data],
  );
  const archive = trpc.hr.employees.archive.useMutation({
    onSuccess: async () => {
      toast.success("Employee archived in the scaffold dataset.");
      await utils.hr.employees.list.invalidate();
      await utils.hr.dashboard.invalidate();
    },
  });
  const exportCsv = trpc.hr.employees.exportCsv.useMutation({
    onSuccess: result => {
      const blob = new Blob([result.csvContent], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${result.rowCount} employee records to CSV. Audit reference ${result.auditEntryId}.`);
      void bulkAudit.refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });
  const importCsv = trpc.hr.employees.importCsv.useMutation({
    onSuccess: async result => {
      setBulkImportSummary({
        createdCount: result.createdCount,
        errorCount: result.errorCount,
        importedEmployeeNumbers: result.importedEmployeeNumbers,
        errorReportFileName: result.errorReportFileName,
        errorReportCsv: result.errorReportCsv,
        auditEntryId: result.auditEntryId,
      });
      void bulkAudit.refetch();
      setBulkImportErrors(result.errors);
      if (result.createdCount > 0) {
        await utils.hr.employees.list.invalidate();
        await utils.hr.dashboard.invalidate();
      }
      if (result.errorCount > 0 && result.createdCount > 0) {
        toast.warning(`Imported ${result.createdCount} employees with ${result.errorCount} row issues to review.`);
        return;
      }
      if (result.errorCount > 0) {
        toast.error(`Import stopped on ${result.errorCount} invalid row${result.errorCount === 1 ? "" : "s"}.`);
        return;
      }
      toast.success(`Imported ${result.createdCount} employee records successfully.`);
      setCsvDraft("");
      setSelectedCsvFileName(null);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-6">
      <PageIntro
        title="Employee records"
        description="The list supports protected search, scoped filtering, pagination, and record-level actions without exposing the underlying database directly."
        action={
          permissions.data?.canManageEmployees ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => exportCsv.mutate({
                  search,
                  departmentId: departmentId === "all" ? null : Number(departmentId),
                  status: status === "all" ? null : (status as "active" | "on_leave" | "probation" | "archived"),
                  managerId: managerId === "all" ? null : Number(managerId),
                })}
                disabled={exportCsv.isPending}
              >
                <Download className="mr-2 h-4 w-4" />
                {exportCsv.isPending ? "Exporting..." : "Export CSV"}
              </Button>
              <Link href="/employees/new">
                <Button className="rounded-2xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Add employee
                </Button>
              </Link>
            </div>
          ) : null
        }
      />

      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="grid gap-4 p-6 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label htmlFor="employee-search">Search</Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input id="employee-search" className="pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name, email, title, or employee number" />
            </div>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={value => setDepartmentId(value)}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="All departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {employees.data?.departments?.map(department => (
                  <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={value => setStatus(value)}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="probation">Probation</SelectItem>
                <SelectItem value="on_leave">On leave</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Manager</Label>
            <Select value={managerId} onValueChange={value => setManagerId(value)}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="All managers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All managers</SelectItem>
                {employees.data?.managers?.map(manager => (
                  <SelectItem key={manager.id} value={String(manager.id)}>{manager.firstName} {manager.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <PilotSupportPanel
        role={(permissions.data?.role ?? "employee") as Role}
        screen="employees"
        extraPackFileNames={["pilot-human-friendly-employee-import.csv"]}
      />

      {permissions.data?.canManageEmployees ? (
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Bulk CSV administration</CardTitle>
            <CardDescription>
              Export the filtered employee scope, then use the same header contract for safe batch imports. Required headers: {bulkEmployeeCsvHeaders.join(", ")}.
            </CardDescription>
            <p className="px-6 pb-2 text-sm text-slate-500">
              Imports also accept human-friendly references. You can resolve departments by ID, code, or name, and managers by ID, employee number, or email, so testers do not need to look up raw internal IDs before loading a CSV.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Pilot CSV checklist</p>
              <p className="mt-2">Start from the shared template, keep the required headers in place, and prefer <strong>departmentName</strong> plus <strong>managerEmail</strong> when preparing human-friendly imports for internal testing.</p>
              <p className="mt-2">After each upload, review the persistent import summary and download the row-error report if any records are flagged for follow-up.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => setCsvDraft(csvTemplate)}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Load CSV template
              </Button>
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-2">
                <Upload className="h-4 w-4 text-slate-500" />
                <Label htmlFor="employee-csv-upload" className="cursor-pointer text-sm font-medium text-slate-700">
                  {selectedCsvFileName ?? "Choose CSV file"}
                </Label>
                <Input
                  id="employee-csv-upload"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={async event => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setSelectedCsvFileName(file.name);
                    setBulkImportSummary(null);
                    setBulkImportErrors([]);
                    setCsvDraft(await file.text());
                  }}
                />
              </div>
              <Button
                onClick={() => importCsv.mutate({ csvText: csvDraft })}
                disabled={importCsv.isPending || csvDraft.trim().length === 0}
              >
                <Upload className="mr-2 h-4 w-4" />
                {importCsv.isPending ? "Importing..." : "Import CSV"}
              </Button>
            </div>
            <Textarea
              value={csvDraft}
              onChange={event => {
                setBulkImportSummary(null);
                setBulkImportErrors([]);
                setCsvDraft(event.target.value);
              }}
              rows={10}
              placeholder={csvTemplate}
              className="font-mono text-xs leading-6"
            />
            {bulkImportSummary ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-medium">Last import summary</p>
                <p className="mt-2">
                  Created <strong>{bulkImportSummary.createdCount}</strong> employee record{bulkImportSummary.createdCount === 1 ? "" : "s"} and flagged <strong>{bulkImportSummary.errorCount}</strong> row{bulkImportSummary.errorCount === 1 ? "" : "s"} for review.
                </p>
                {bulkImportSummary.importedEmployeeNumbers.length ? (
                  <p className="mt-2 text-emerald-800">Imported employee numbers: {bulkImportSummary.importedEmployeeNumbers.join(", ")}.</p>
                ) : null}
                <p className="mt-2 text-emerald-800">Audit reference: {bulkImportSummary.auditEntryId}.</p>
                {bulkImportSummary.errorReportCsv && bulkImportSummary.errorReportFileName ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 rounded-2xl border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100"
                    onClick={() => {
                      const blob = new Blob([bulkImportSummary.errorReportCsv ?? ""], { type: "text/csv;charset=utf-8" });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = bulkImportSummary.errorReportFileName ?? "employee-bulk-import-errors.csv";
                      link.click();
                      window.URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download error report
                  </Button>
                ) : null}
              </div>
            ) : null}
            {bulkImportErrors.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-amber-900">Rows needing attention</p>
                  {bulkImportSummary?.errorReportCsv && bulkImportSummary.errorReportFileName ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-2xl border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                      onClick={() => {
                        const blob = new Blob([bulkImportSummary.errorReportCsv ?? ""], { type: "text/csv;charset=utf-8" });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = bulkImportSummary.errorReportFileName ?? "employee-bulk-import-errors.csv";
                        link.click();
                        window.URL.revokeObjectURL(url);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download row errors
                    </Button>
                  ) : null}
                </div>
                <div className="mt-3 space-y-2 text-sm text-amber-900">
                  {bulkImportErrors.map(error => (
                    <div key={`${error.rowNumber}-${error.employeeNumber ?? "row"}`} className="rounded-2xl bg-white/70 px-3 py-2">
                      Row {error.rowNumber}{error.employeeNumber ? ` · ${error.employeeNumber}` : ""}: {error.message}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {permissions.data?.canViewAudit ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">Recent bulk CSV activity</p>
                    <p className="text-sm text-slate-500">Latest import and export events recorded in the append-only audit trail.</p>
                  </div>
                  <Link href="/audit">
                    <Button variant="outline" size="sm" className="rounded-2xl">Open audit log</Button>
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {recentBulkActivity.length ? recentBulkActivity.map(entry => {
                    const rowCount = Number(entry.details.rowCount ?? entry.details.createdCount ?? 0);
                    const errorCount = Number(entry.details.errorCount ?? 0);
                    return (
                      <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-900">
                            {entry.action === "employee.bulk_exported" ? "CSV export" : "CSV import"} · audit #{entry.id}
                          </p>
                          <span className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-2 text-slate-600">
                          {entry.action === "employee.bulk_exported"
                            ? `Exported ${rowCount} row${rowCount === 1 ? "" : "s"}.`
                            : `Imported ${rowCount} employee record${rowCount === 1 ? "" : "s"} with ${errorCount} row issue${errorCount === 1 ? "" : "s"}.`}
                        </p>
                      </div>
                    );
                  }) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
                      No bulk CSV activity has been recorded yet in this session.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Start date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.data?.rows?.map(employee => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900">{employee.firstName} {employee.lastName}</p>
                      <p className="text-sm text-slate-500">{employee.employeeNumber} · {employee.jobTitle}</p>
                    </div>
                  </TableCell>
                  <TableCell>{employee.departmentName}</TableCell>
                  <TableCell><Badge className={statusTone(employee.employmentStatus)}>{employee.employmentStatus}</Badge></TableCell>
                  <TableCell>{employee.managerName}</TableCell>
                  <TableCell>{employee.startDate}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/employees/${employee.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      {permissions.data?.canManageEmployees ? (
                        <Button variant="outline" size="sm" onClick={() => toast.info("Edit screen is represented by the employee profile tabs in this scaffold.")}>Edit</Button>
                      ) : null}
                      {permissions.data?.canManageEmployees ? (
                        <Button variant="outline" size="sm" onClick={() => archive.mutate({ employeeId: employee.id })}>
                          <Archive className="mr-2 h-4 w-4" />Archive
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        <p>Showing page {employees.data?.page ?? 1} of {Math.max(1, Math.ceil((employees.data?.total ?? 0) / (employees.data?.pageSize ?? 8)))}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</Button>
          <Button variant="outline" size="sm" disabled={(employees.data?.rows?.length ?? 0) < (employees.data?.pageSize ?? 8)} onClick={() => setPage(current => current + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

export function AddEmployeePage() {
  const utils = trpc.useUtils();
  const departments = trpc.hr.departments.list.useQuery();
  const employeeOptions = trpc.hr.employees.list.useQuery({ page: 1, pageSize: 50, search: "" });
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    personal: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      niNumber: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      postcode: "",
      phone: "",
      email: "",
    },
    employment: {
      employeeNumber: "",
      departmentId: 1,
      jobTitle: "",
      managerId: null as number | null,
      employmentStatus: "active" as "active" | "on_leave" | "probation" | "archived",
      startDate: "",
    },
    contract: {
      contractType: "permanent" as "permanent" | "fixed_term" | "temporary" | "contractor",
      salaryBasis: "annual",
      salaryAmount: 0,
      hoursPerWeek: 37,
      startDate: "",
      endDate: "",
      probationEndDate: "",
    },
    documents: [
      { category: "contract" as DocumentCategory, name: "Employment Contract", expiryDate: "" },
    ],
  });

  const createEmployee = trpc.hr.employees.create.useMutation({
    onSuccess: async () => {
      toast.success("Employee created in the scaffold dataset.");
      await utils.hr.employees.list.invalidate();
      await utils.hr.dashboard.invalidate();
      setStep(1);
    },
  });

  const steps = ["Personal details", "Employment details", "Contract details", "Document upload"];

  return (
    <div className="space-y-6">
      <PageIntro
        title="Add employee wizard"
        description="The onboarding flow is organised into four guided steps so HR can capture personal, employment, contract, and document details with validation before submission."
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {steps.map((label, index) => {
          const active = index + 1 === step;
          const complete = index + 1 < step;
          return (
            <div key={label} className={`rounded-2xl border p-4 ${active ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Step {index + 1}</p>
              <p className="mt-2 font-medium text-slate-900">{label}</p>
              {complete ? <CheckCircle2 className="mt-3 h-5 w-5 text-emerald-500" /> : null}
            </div>
          );
        })}
      </div>

      <Card className="border-slate-200/80 bg-white shadow-sm">
        <CardContent className="space-y-6 p-6">
          {step === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>First name</Label><Input className="mt-2" value={form.personal.firstName} onChange={event => setForm(current => ({ ...current, personal: { ...current.personal, firstName: event.target.value } }))} /></div>
              <div><Label>Last name</Label><Input className="mt-2" value={form.personal.lastName} onChange={event => setForm(current => ({ ...current, personal: { ...current.personal, lastName: event.target.value } }))} /></div>
              <div><Label>Date of birth</Label><Input className="mt-2" type="date" value={form.personal.dateOfBirth} onChange={event => setForm(current => ({ ...current, personal: { ...current.personal, dateOfBirth: event.target.value } }))} /></div>
              <div><Label>NI number</Label><Input className="mt-2" value={form.personal.niNumber} onChange={event => setForm(current => ({ ...current, personal: { ...current.personal, niNumber: event.target.value } }))} /></div>
              <div><Label>Email</Label><Input className="mt-2" type="email" value={form.personal.email} onChange={event => setForm(current => ({ ...current, personal: { ...current.personal, email: event.target.value } }))} /></div>
              <div><Label>Phone</Label><Input className="mt-2" value={form.personal.phone} onChange={event => setForm(current => ({ ...current, personal: { ...current.personal, phone: event.target.value } }))} /></div>
              <div className="md:col-span-2"><Label>Address line 1</Label><Input className="mt-2" value={form.personal.addressLine1} onChange={event => setForm(current => ({ ...current, personal: { ...current.personal, addressLine1: event.target.value } }))} /></div>
              <div className="md:col-span-2"><Label>Address line 2</Label><Input className="mt-2" value={form.personal.addressLine2} onChange={event => setForm(current => ({ ...current, personal: { ...current.personal, addressLine2: event.target.value } }))} /></div>
              <div><Label>City</Label><Input className="mt-2" value={form.personal.city} onChange={event => setForm(current => ({ ...current, personal: { ...current.personal, city: event.target.value } }))} /></div>
              <div><Label>Postcode</Label><Input className="mt-2" value={form.personal.postcode} onChange={event => setForm(current => ({ ...current, personal: { ...current.personal, postcode: event.target.value } }))} /></div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Employee number</Label><Input className="mt-2" value={form.employment.employeeNumber} onChange={event => setForm(current => ({ ...current, employment: { ...current.employment, employeeNumber: event.target.value } }))} /></div>
              <div><Label>Job title</Label><Input className="mt-2" value={form.employment.jobTitle} onChange={event => setForm(current => ({ ...current, employment: { ...current.employment, jobTitle: event.target.value } }))} /></div>
              <div>
                <Label>Department</Label>
                <Select value={String(form.employment.departmentId)} onValueChange={value => setForm(current => ({ ...current, employment: { ...current.employment, departmentId: Number(value) } }))}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {departments.data?.map(department => <SelectItem key={department.id} value={String(department.id)}>{department.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Manager</Label>
                <Select value={form.employment.managerId ? String(form.employment.managerId) : "none"} onValueChange={value => setForm(current => ({ ...current, employment: { ...current.employment, managerId: value === "none" ? null : Number(value) } }))}>
                  <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No manager</SelectItem>
                    {employeeOptions.data?.rows?.map(employee => <SelectItem key={employee.id} value={String(employee.id)}>{employee.firstName} {employee.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Employment status</Label><Select value={form.employment.employmentStatus} onValueChange={value => setForm(current => ({ ...current, employment: { ...current.employment, employmentStatus: value as "active" | "on_leave" | "probation" | "archived" } }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="probation">Probation</SelectItem><SelectItem value="on_leave">On leave</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></div>
              <div><Label>Start date</Label><Input className="mt-2" type="date" value={form.employment.startDate} onChange={event => setForm(current => ({ ...current, employment: { ...current.employment, startDate: event.target.value } }))} /></div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Contract type</Label><Select value={form.contract.contractType} onValueChange={value => setForm(current => ({ ...current, contract: { ...current.contract, contractType: value as "permanent" | "fixed_term" | "temporary" | "contractor" } }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="permanent">Permanent</SelectItem><SelectItem value="fixed_term">Fixed term</SelectItem><SelectItem value="temporary">Temporary</SelectItem><SelectItem value="contractor">Contractor</SelectItem></SelectContent></Select></div>
              <div><Label>Salary basis</Label><Input className="mt-2" value={form.contract.salaryBasis} onChange={event => setForm(current => ({ ...current, contract: { ...current.contract, salaryBasis: event.target.value } }))} /></div>
              <div><Label>Salary amount</Label><Input className="mt-2" type="number" value={form.contract.salaryAmount} onChange={event => setForm(current => ({ ...current, contract: { ...current.contract, salaryAmount: Number(event.target.value) } }))} /></div>
              <div><Label>Hours per week</Label><Input className="mt-2" type="number" value={form.contract.hoursPerWeek} onChange={event => setForm(current => ({ ...current, contract: { ...current.contract, hoursPerWeek: Number(event.target.value) } }))} /></div>
              <div><Label>Contract start date</Label><Input className="mt-2" type="date" value={form.contract.startDate} onChange={event => setForm(current => ({ ...current, contract: { ...current.contract, startDate: event.target.value } }))} /></div>
              <div><Label>Contract end date</Label><Input className="mt-2" type="date" value={form.contract.endDate} onChange={event => setForm(current => ({ ...current, contract: { ...current.contract, endDate: event.target.value } }))} /></div>
              <div><Label>Probation end date</Label><Input className="mt-2" type="date" value={form.contract.probationEndDate} onChange={event => setForm(current => ({ ...current, contract: { ...current.contract, probationEndDate: event.target.value } }))} /></div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              {form.documents.map((document, index) => (
                <div key={`${document.category}-${index}`} className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-3">
                  <div><Label>Category</Label><Select value={document.category} onValueChange={value => setForm(current => ({ ...current, documents: current.documents.map((item, itemIndex) => itemIndex === index ? { ...item, category: value as DocumentCategory } : item) }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{securedDocumentCategories.map(category => <SelectItem key={category} value={category}>{documentCategoryLabels[category]}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Document name</Label><Input className="mt-2" value={document.name} onChange={event => setForm(current => ({ ...current, documents: current.documents.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /></div>
                  <div><Label>Expiry date</Label><Input className="mt-2" type="date" value={document.expiryDate} onChange={event => setForm(current => ({ ...current, documents: current.documents.map((item, itemIndex) => itemIndex === index ? { ...item, expiryDate: event.target.value } : item) }))} /></div>
                </div>
              ))}
              <Button variant="outline" onClick={() => setForm(current => ({ ...current, documents: [...current.documents, { category: "qualification" as DocumentCategory, name: "", expiryDate: "" }] }))}><Plus className="mr-2 h-4 w-4" />Add document placeholder</Button>
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep(current => current - 1)}>Previous</Button>
            {step < 4 ? (
              <Button onClick={() => setStep(current => current + 1)}>Next step <ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button onClick={() => createEmployee.mutate({
                personal: form.personal,
                employment: form.employment,
                contract: {
                  ...form.contract,
                  endDate: form.contract.endDate || null,
                  probationEndDate: form.contract.probationEndDate || null,
                },
                documents: form.documents.map(document => ({ ...document, expiryDate: document.expiryDate || null })),
              })}>Create employee</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function EmployeeProfilePage({ params }: RouteParams) {
  const employeeId = Number(params.id);
  const permissions = trpc.hr.permissions.useQuery();
  const utils = trpc.useUtils();
  const detail = trpc.hr.employees.detail.useQuery({ employeeId });
  const registrations = trpc.hr.registrations.list.useQuery();
  const createRegistration = trpc.hr.registrations.create.useMutation({
    onSuccess: async () => {
      toast.success("Professional registration added.");
      await utils.hr.registrations.list.invalidate();
      await utils.hr.dashboard.invalidate();
    },
  });
  const [registrationForm, setRegistrationForm] = useState({
    bodyName: "",
    registrationNumber: "",
    annualExpiryDate: "",
    reminderDays: 30,
  });

  const employee = detail.data?.employee;
  const employeeRegistrations = registrations.data?.filter(record => record.employeeId === employeeId) ?? [];

  if (!employee) {
    return <Card className="border-slate-200 bg-white"><CardContent className="p-6">Employee not found in the current role scope.</CardContent></Card>;
  }

  return (
    <div className="space-y-6">
      <PageIntro
        title={`${employee.firstName} ${employee.lastName}`}
        description="The employee profile groups lifecycle data into tabbed sections so HR and managers can review key information without direct database access."
        action={<Badge className={statusTone(employee.employmentStatus)}>{employee.employmentStatus}</Badge>}
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-2 rounded-2xl border border-slate-200 bg-white p-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="leave">Leave History</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-[1fr,0.9fr]">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Employee number</p><p className="mt-2 font-medium text-slate-900">{employee.employeeNumber}</p></div>
                <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Department</p><p className="mt-2 font-medium text-slate-900">{detail.data?.department?.name ?? "—"}</p></div>
                <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Manager</p><p className="mt-2 font-medium text-slate-900">{detail.data?.manager ? `${detail.data.manager.firstName} ${detail.data.manager.lastName}` : "—"}</p></div>
                <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Start date</p><p className="mt-2 font-medium text-slate-900">{employee.startDate}</p></div>
                <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</p><p className="mt-2 font-medium text-slate-900">{employee.email}</p></div>
                <div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Phone</p><p className="mt-2 font-medium text-slate-900">{employee.phone ?? "—"}</p></div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>Professional registration</CardTitle>
                <CardDescription>Annual expiry is monitored as part of the compliance alert flow.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {employeeRegistrations.map(record => (
                  <div key={record.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{record.bodyName}</p>
                        <p className="text-sm text-slate-500">{record.registrationNumber}</p>
                      </div>
                      <Badge className={statusTone(record.status)}>{record.status}</Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">Expiry date: {record.annualExpiryDate}</p>
                  </div>
                ))}
                {permissions.data?.canManageCompliance ? (
                  <div className="grid gap-3 rounded-2xl border border-dashed border-slate-200 p-4">
                    <div><Label>Professional body</Label><Input className="mt-2" value={registrationForm.bodyName} onChange={event => setRegistrationForm(current => ({ ...current, bodyName: event.target.value }))} /></div>
                    <div><Label>Registration number</Label><Input className="mt-2" value={registrationForm.registrationNumber} onChange={event => setRegistrationForm(current => ({ ...current, registrationNumber: event.target.value }))} /></div>
                    <div><Label>Expiry date</Label><Input className="mt-2" type="date" value={registrationForm.annualExpiryDate} onChange={event => setRegistrationForm(current => ({ ...current, annualExpiryDate: event.target.value }))} /></div>
                    <div><Label>Reminder window (days)</Label><Input className="mt-2" type="number" value={registrationForm.reminderDays} onChange={event => setRegistrationForm(current => ({ ...current, reminderDays: Number(event.target.value) }))} /></div>
                    <Button onClick={() => createRegistration.mutate({ employeeId, ...registrationForm })}>Add registration</Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employment">
          <Card className="border-slate-200 bg-white shadow-sm"><CardContent className="grid gap-4 p-6 md:grid-cols-2"><div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Date of birth</p><p className="mt-2 font-medium text-slate-900">{employee.dateOfBirth}</p></div><div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">NI number</p><p className="mt-2 font-medium text-slate-900">{employee.niNumber}</p></div><div className="md:col-span-2"><p className="text-xs uppercase tracking-[0.2em] text-slate-400">Address</p><p className="mt-2 font-medium text-slate-900">{employee.addressLine1}{employee.addressLine2 ? `, ${employee.addressLine2}` : ""}, {employee.city}, {employee.postcode}</p></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card className="border-slate-200 bg-white shadow-sm"><CardContent className="space-y-4 p-6">{detail.data?.contracts?.map(contract => <div key={contract.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="font-medium text-slate-900">{contract.contractType}</p><p className="text-sm text-slate-500">{contract.salaryBasis} · {contract.salaryAmount.toLocaleString()}</p></div><Badge className={statusTone(contract.status)}>{contract.status}</Badge></div><p className="mt-3 text-sm text-slate-500">Start: {contract.startDate} · End: {contract.endDate ?? "Open-ended"}</p></div>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="border-slate-200 bg-white shadow-sm"><CardContent className="space-y-4 p-6">{detail.data?.documents?.map(document => <div key={document.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="font-medium text-slate-900">{document.name}</p><p className="text-sm text-slate-500">{document.category}</p></div><Badge className={statusTone(document.status)}>{document.status}</Badge></div><p className="mt-3 text-sm text-slate-500">Expiry date: {document.expiryDate ?? "Not set"}</p></div>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card className="border-slate-200 bg-white shadow-sm"><CardContent className="space-y-4 p-6"><div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Current annual balance</p><p className="mt-2 text-3xl font-semibold text-slate-950">{detail.data?.leaveBalance?.annualDays ?? 0} days</p><p className="mt-2 text-sm text-slate-500">Used: {detail.data?.leaveBalance?.usedDays ?? 0} · Pending: {detail.data?.leaveBalance?.pendingDays ?? 0}</p></div>{detail.data?.leaveHistory?.map(request => <div key={request.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="font-medium text-slate-900">{request.leaveType}</p><p className="text-sm text-slate-500">{request.startDate} to {request.endDate}</p></div><Badge className={statusTone(request.status)}>{request.status}</Badge></div></div>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="border-slate-200 bg-white shadow-sm"><CardContent className="space-y-4 p-6">{detail.data?.audit?.map(entry => <div key={entry.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-medium text-slate-900">{entry.action}</p><p className="text-sm text-slate-500">{entry.actorName} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}</p></div><Badge className="border-slate-200 bg-slate-50 text-slate-700">immutable</Badge></div><pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{entry.changedFields}</pre></div>)}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function DepartmentsPage() {
  const utils = trpc.useUtils();
  const departments = trpc.hr.departments.list.useQuery();
  const createDepartment = trpc.hr.departments.create.useMutation({
    onSuccess: async () => {
      toast.success("Department created.");
      await utils.hr.departments.list.invalidate();
    },
  });
  const updateDepartment = trpc.hr.departments.update.useMutation({
    onSuccess: async () => {
      toast.success("Department updated.");
      await utils.hr.departments.list.invalidate();
    },
  });
  const archiveDepartment = trpc.hr.departments.archive.useMutation({
    onSuccess: async () => {
      toast.success("Department archived.");
      await utils.hr.departments.list.invalidate();
    },
  });
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", code: "", managerName: "", description: "" });

  const resetForm = () => {
    setEditingDepartmentId(null);
    setForm({ name: "", code: "", managerName: "", description: "" });
  };

  return (
    <div className="space-y-6">
      <PageIntro title="Departments" description="Department records can be created, edited, and archived with backend validation and audit coverage." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader><CardTitle>{editingDepartmentId ? "Edit department" : "Create department"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Name</Label><Input className="mt-2" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></div>
            <div><Label>Code</Label><Input className="mt-2" value={form.code} onChange={event => setForm(current => ({ ...current, code: event.target.value.toUpperCase() }))} /></div>
            <div><Label>Manager name</Label><Input className="mt-2" value={form.managerName} onChange={event => setForm(current => ({ ...current, managerName: event.target.value }))} /></div>
            <div><Label>Description</Label><Textarea className="mt-2" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} /></div>
            <div className="flex gap-3">
              <Button onClick={() => editingDepartmentId ? updateDepartment.mutate({ departmentId: editingDepartmentId, ...form, managerName: form.managerName || null, description: form.description || null }) : createDepartment.mutate({ ...form, managerName: form.managerName || null, description: form.description || null })}>{editingDepartmentId ? "Update department" : "Save department"}</Button>
              {editingDepartmentId ? <Button variant="outline" onClick={resetForm}>Cancel</Button> : null}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader><CardTitle>Department register</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {departments.data?.map(department => (
              <div key={department.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{department.name}</p>
                  <p className="text-sm text-slate-500">{department.code} · {department.managerName ?? "No manager assigned"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={department.active ? statusTone("active") : statusTone("archived")}>{department.active ? "active" : "archived"}</Badge>
                  {department.active ? <Button variant="outline" size="sm" onClick={() => {
                    setEditingDepartmentId(department.id);
                    setForm({
                      name: department.name,
                      code: department.code,
                      managerName: department.managerName ?? "",
                      description: department.description ?? "",
                    });
                  }}>Edit</Button> : null}
                  {department.active ? <Button variant="outline" size="sm" onClick={() => archiveDepartment.mutate({ departmentId: department.id })}>Archive</Button> : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ContractsPage() {
  const utils = trpc.useUtils();
  const contracts = trpc.hr.contracts.list.useQuery();
  const employees = trpc.hr.employees.list.useQuery({ page: 1, pageSize: 50, search: "" });
  const createContract = trpc.hr.contracts.create.useMutation({
    onSuccess: async () => {
      toast.success("Contract saved.");
      await utils.hr.contracts.list.invalidate();
      await utils.hr.dashboard.invalidate();
    },
  });
  const updateContract = trpc.hr.contracts.update.useMutation({
    onSuccess: async () => {
      toast.success("Contract updated.");
      await utils.hr.contracts.list.invalidate();
      await utils.hr.dashboard.invalidate();
    },
  });
  const [editingContractId, setEditingContractId] = useState<number | null>(null);
  const [form, setForm] = useState({
    employeeId: 1,
    contractType: "permanent",
    status: "active",
    salaryBasis: "annual",
    salaryAmount: 0,
    hoursPerWeek: 37,
    startDate: "",
    endDate: "",
    probationEndDate: "",
    reviewDate: "",
  });

  const payload = { ...form, endDate: form.endDate || null, probationEndDate: form.probationEndDate || null, reviewDate: form.reviewDate || null, contractType: form.contractType as "permanent" | "fixed_term" | "temporary" | "contractor", status: form.status as "draft" | "active" | "ending_soon" | "expired" | "superseded" };

  return (
    <div className="space-y-6">
      <PageIntro title="Contracts" description="Contract records include lifecycle status, salary details, probation milestones, proactive expiry alerts, and editable renewal workflows." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader><CardTitle>{editingContractId ? "Update contract" : "Create contract"}</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div><Label>Employee</Label><Select value={String(form.employeeId)} onValueChange={value => setForm(current => ({ ...current, employeeId: Number(value) }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{employees.data?.rows?.map(employee => <SelectItem key={employee.id} value={String(employee.id)}>{employee.firstName} {employee.lastName}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Contract type</Label><Select value={form.contractType} onValueChange={value => setForm(current => ({ ...current, contractType: value }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="permanent">Permanent</SelectItem><SelectItem value="fixed_term">Fixed term</SelectItem><SelectItem value="temporary">Temporary</SelectItem><SelectItem value="contractor">Contractor</SelectItem></SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={value => setForm(current => ({ ...current, status: value }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="ending_soon">Ending soon</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="superseded">Superseded</SelectItem></SelectContent></Select></div>
            <div><Label>Salary basis</Label><Input className="mt-2" value={form.salaryBasis} onChange={event => setForm(current => ({ ...current, salaryBasis: event.target.value }))} /></div>
            <div><Label>Salary amount</Label><Input className="mt-2" type="number" value={form.salaryAmount} onChange={event => setForm(current => ({ ...current, salaryAmount: Number(event.target.value) }))} /></div>
            <div><Label>Hours per week</Label><Input className="mt-2" type="number" value={form.hoursPerWeek} onChange={event => setForm(current => ({ ...current, hoursPerWeek: Number(event.target.value) }))} /></div>
            <div><Label>Start date</Label><Input className="mt-2" type="date" value={form.startDate} onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))} /></div>
            <div><Label>End date</Label><Input className="mt-2" type="date" value={form.endDate} onChange={event => setForm(current => ({ ...current, endDate: event.target.value }))} /></div>
            <div className="flex gap-3">
              <Button onClick={() => editingContractId ? updateContract.mutate({ contractId: editingContractId, ...payload }) : createContract.mutate(payload)}>{editingContractId ? "Update contract" : "Save contract"}</Button>
              {editingContractId ? <Button variant="outline" onClick={() => {
                setEditingContractId(null);
                setForm({ employeeId: 1, contractType: "permanent", status: "active", salaryBasis: "annual", salaryAmount: 0, hoursPerWeek: 37, startDate: "", endDate: "", probationEndDate: "", reviewDate: "" });
              }}>Cancel</Button> : null}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader><CardTitle>Lifecycle view</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {contracts.data?.map(contract => (
              <div key={contract.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{contract.employeeName}</p>
                    <p className="text-sm text-slate-500">{contract.contractType} · {contract.salaryBasis}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusTone(contract.status)}>{contract.status}</Badge>
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingContractId(contract.id);
                      setForm({
                        employeeId: contract.employeeId,
                        contractType: contract.contractType,
                        status: contract.status,
                        salaryBasis: contract.salaryBasis,
                        salaryAmount: contract.salaryAmount,
                        hoursPerWeek: contract.hoursPerWeek,
                        startDate: contract.startDate,
                        endDate: contract.endDate ?? "",
                        probationEndDate: contract.probationEndDate ?? "",
                        reviewDate: contract.reviewDate ?? "",
                      });
                    }}>Edit</Button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">Start: {contract.startDate} · End: {contract.endDate ?? "Open-ended"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DocumentsPage() {
  const utils = trpc.useUtils();
  const documents = trpc.hr.documents.list.useQuery();
  const employees = trpc.hr.employees.list.useQuery({ page: 1, pageSize: 50, search: "" });
  const uploadDocument = trpc.hr.documents.upload.useMutation({
    onSuccess: async () => {
      toast.success("Document uploaded to protected storage.");
      await utils.hr.documents.list.invalidate();
      await utils.hr.dashboard.invalidate();
    },
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState<{ employeeId: number; category: DocumentCategory; name: string; expiryDate: string }>({ employeeId: 1, category: "contract", name: "", expiryDate: "" });

  async function handleUpload() {
    if (!selectedFile) {
      toast.error("Choose a file before uploading.");
      return;
    }
    const bytes = new Uint8Array(await selectedFile.arrayBuffer());
    let binary = "";
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    await uploadDocument.mutateAsync({
      employeeId: form.employeeId,
      category: form.category,
      name: form.name || selectedFile.name,
      expiryDate: form.expiryDate || null,
      fileName: selectedFile.name,
      mimeType: selectedFile.type || "application/octet-stream",
      fileDataBase64: btoa(binary),
    });
    setSelectedFile(null);
    setForm(current => ({ ...current, name: "", expiryDate: "" }));
  }

  return (
    <div className="space-y-6">
      <PageIntro title="Documents" description="Document uploads now route file bytes through protected server storage, while the register tracks category, ownership, and expiry risk." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader><CardTitle>Secure upload</CardTitle><CardDescription>Files are uploaded through the protected application layer and stored with tracked metadata.</CardDescription></CardHeader>
          <CardContent className="grid gap-4">
            <div><Label>Employee</Label><Select value={String(form.employeeId)} onValueChange={value => setForm(current => ({ ...current, employeeId: Number(value) }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{employees.data?.rows?.map(employee => <SelectItem key={employee.id} value={String(employee.id)}>{employee.firstName} {employee.lastName}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Category</Label><Select value={form.category} onValueChange={value => setForm(current => ({ ...current, category: value as DocumentCategory }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{securedDocumentCategories.map(category => <SelectItem key={category} value={category}>{documentCategoryLabels[category]}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Document name</Label><Input className="mt-2" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Defaults to the uploaded file name" /></div>
            <div><Label>Expiry date</Label><Input className="mt-2" type="date" value={form.expiryDate} onChange={event => setForm(current => ({ ...current, expiryDate: event.target.value }))} /></div>
            <div><Label>File</Label><Input className="mt-2" type="file" onChange={event => setSelectedFile(event.target.files?.[0] ?? null)} /></div>
            <Button onClick={handleUpload} disabled={uploadDocument.isPending}>Upload document</Button>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader><CardTitle>Document register</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {documents.data?.map(document => (
              <div key={document.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{document.name}</p>
                    <p className="text-sm text-slate-500">{document.employeeName} · {documentCategoryLabels[document.category as DocumentCategory] ?? document.category}</p>
                  </div>
                  <Badge className={statusTone(document.status)}>{document.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-500">Expiry date: {document.expiryDate ?? "Not set"}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => window.open(document.fileUrl, "_blank", "noopener,noreferrer")}>Open secure file</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function LeavePage() {
  const utils = trpc.useUtils();
  const permissions = trpc.hr.permissions.useQuery();
  const leave = trpc.hr.leave.list.useQuery();
  const employees = trpc.hr.employees.list.useQuery({ page: 1, pageSize: 50, search: "" });
  const createLeave = trpc.hr.leave.create.useMutation({
    onSuccess: async () => {
      toast.success("Leave request created.");
      await utils.hr.leave.list.invalidate();
      await utils.hr.dashboard.invalidate();
    },
  });
  const approveLeave = trpc.hr.leave.approve.useMutation({
    onSuccess: async () => {
      toast.success("Leave request approved.");
      await utils.hr.leave.list.invalidate();
      await utils.hr.dashboard.invalidate();
    },
  });
  const [form, setForm] = useState({ employeeId: 1, leaveType: "annual", startDate: "", endDate: "", daysRequested: 1, notes: "" });

  return (
    <div className="space-y-6">
      <PageIntro title="Leave workflow" description="The workflow includes request submission, role-based approvals, automatic balance updates, and a calendar-style overview for operational planning." />
      <PilotGuidance title="Leave pilot guidance">
        <p>Employees and managers should submit requests from the form on the left, while approvers should then confirm the request appears in the queue with the correct scoped employee name.</p>
        <p>Managers, HR, and administrators can approve pending requests directly from the queue. Employees should only verify their own leave history and must not expect approval controls.</p>
      </PilotGuidance>

      <PilotSupportPanel
        role={(permissions.data?.role ?? "employee") as Role}
        screen="leave"
        extraPackFileNames={["pilot-leave-scenarios.md"]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader><CardTitle>Create leave request</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div><Label>Employee</Label><Select value={String(form.employeeId)} onValueChange={value => setForm(current => ({ ...current, employeeId: Number(value) }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{employees.data?.rows?.map(employee => <SelectItem key={employee.id} value={String(employee.id)}>{employee.firstName} {employee.lastName}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Leave type</Label><Select value={form.leaveType} onValueChange={value => setForm(current => ({ ...current, leaveType: value }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="annual">Annual</SelectItem><SelectItem value="sick">Sick</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div><Label>Start date</Label><Input className="mt-2" type="date" value={form.startDate} onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))} /></div>
            <div><Label>End date</Label><Input className="mt-2" type="date" value={form.endDate} onChange={event => setForm(current => ({ ...current, endDate: event.target.value }))} /></div>
            <div><Label>Days requested</Label><Input className="mt-2" type="number" value={form.daysRequested} onChange={event => setForm(current => ({ ...current, daysRequested: Number(event.target.value) }))} /></div>
            <div><Label>Notes</Label><Textarea className="mt-2" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></div>
            <Button onClick={() => createLeave.mutate({ employeeId: form.employeeId, leaveType: form.leaveType as "annual" | "sick" | "unpaid" | "other", startDate: form.startDate, endDate: form.endDate, daysRequested: form.daysRequested, notes: form.notes })}>Submit request</Button>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader><CardTitle>Approval queue</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {leave.data?.requests?.map(request => (
                <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{request.employeeName}</p>
                      <p className="text-sm text-slate-500">{request.leaveType} · {request.startDate} to {request.endDate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusTone(request.status)}>{request.status}</Badge>
                      {permissions.data?.canApproveLeave && request.status === "pending" ? <Button size="sm" onClick={() => approveLeave.mutate({ requestId: request.id })}>Approve</Button> : null}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader><CardTitle>Leave calendar view</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {leave.data?.calendar?.map(item => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{new Date(item.startDate).toLocaleDateString()} → {new Date(item.endDate).toLocaleDateString()}</p>
                  <Badge className={`mt-3 ${statusTone(item.status)}`}>{item.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function AuditPage() {
  const audit = trpc.hr.audit.list.useQuery();

  return (
    <div className="space-y-6">
      <PageIntro title="Audit log" description="The audit trail is append-only in the scaffold and captures actor identity, role, timestamp, action name, and changed field values for compliance review." />
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-4 p-6">
          {audit.data?.map(entry => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-slate-900">{entry.action}</p>
                  <p className="text-sm text-slate-500">{entry.actorName} · {entry.actorRole} · {new Date(entry.createdAt).toLocaleString()}</p>
                </div>
                <Badge className="border-slate-200 bg-slate-50 text-slate-700">{entry.entityType}</Badge>
              </div>
              <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{entry.changedFields}</pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function CompliancePage() {
  const utils = trpc.useUtils();
  const permissions = trpc.hr.permissions.useQuery();
  const dashboard = trpc.hr.dashboard.useQuery();
  const compliance = trpc.hr.compliance.list.useQuery();
  const sendReminders = trpc.hr.compliance.sendReminders.useMutation({
    onSuccess: async result => {
      if (result.sent) {
        toast.success(result.summary);
      } else {
        toast.message(result.summary);
      }
      await utils.hr.compliance.list.invalidate();
      await utils.hr.dashboard.invalidate();
    },
  });
  const takeAction = trpc.hr.compliance.takeAction.useMutation({
    onSuccess: async result => {
      toast.success(result?.item ? `Compliance state updated to ${complianceWorkflowLabels[result.item.currentState]}.` : "Compliance action saved.");
      await utils.hr.compliance.list.invalidate();
      await utils.hr.dashboard.invalidate();
      await utils.hr.documents.list.invalidate();
      await utils.hr.contracts.list.invalidate();
      await utils.hr.registrations.list.invalidate();
    },
  });

  useEffect(() => {
    if (compliance.isSuccess && (compliance.data?.reminders?.length ?? 0) === 0 && !sendReminders.isPending) {
      sendReminders.mutate();
    }
  }, [compliance.data?.reminders?.length, compliance.isSuccess, sendReminders]);

  const items = compliance.data?.items ?? [];
  const reminders = compliance.data?.reminders ?? [];
  const openItems = items.filter(item => item.currentState === "open");

  function handleAction(entityType: "contract" | "document" | "professional_registration", entityId: number, state: ComplianceWorkflowState) {
    takeAction.mutate({ entityType, entityId, state });
  }

  return (
    <div className="space-y-6">
      <PageIntro
        title="Compliance oversight"
        description="This workspace separates compliance monitoring from the raw audit trail, giving HR teams a focused queue for renewals, replacements, review decisions, and reminder activity."
        action={
          <Button className="rounded-2xl" variant="outline" onClick={() => sendReminders.mutate()} disabled={sendReminders.isPending}>
            <ArrowRight className="mr-2 h-4 w-4" />
            {sendReminders.isPending ? "Sending reminders..." : "Send reminder digest"}
          </Button>
        }
      />
      <PilotGuidance title="Compliance pilot guidance">
        <p>Review the action queue from highest severity to lowest, then record one workflow step at a time so the latest state remains easy to audit.</p>
        <p>Use reminder delivery only after checking the queue and priority snapshot, because the digest is intended to summarize outstanding work rather than replace the on-screen review.</p>
      </PilotGuidance>

      <PilotSupportPanel
        role={(permissions.data?.role ?? "hr") as Role}
        screen="compliance"
        extraPackFileNames={["pilot-compliance-scenarios.md", "pilot-document-expiry-scenarios.md"]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Open compliance items" value={compliance.data?.summary.openItems ?? 0} description="Items still waiting for a recorded workflow action." icon={CircleAlert} />
        <MetricCard title="Renewals in progress" value={compliance.data?.summary.renewalInProgress ?? 0} description="Records where renewal work has been started and logged." icon={FileClock} />
        <MetricCard title="Replacement requests" value={compliance.data?.summary.replacementRequested ?? 0} description="Items currently waiting on refreshed evidence or replacement files." icon={ShieldCheck} />
        <MetricCard title="Resolved items" value={compliance.data?.summary.resolvedItems ?? 0} description="Compliance records that now have a closed status update." icon={CheckCircle2} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Action queue</CardTitle>
            <CardDescription>Use workflow actions to mark review progress, request replacements, or advance renewals directly from the compliance workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length ? items.map(item => (
              <div key={`${item.entityType}-${item.entityId}`} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.employeeName} · {item.description}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Due: {item.dueDate ?? "Not set"} {item.daysRemaining !== null ? `· ${item.daysRemaining} days remaining` : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Workflow state: <span className="font-medium text-slate-700">{complianceWorkflowLabels[item.currentState]}</span>
                      {item.lastActionBy ? ` · last updated by ${item.lastActionBy}` : ""}
                    </p>
                  </div>
                  <Badge className={item.severity === "high" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{item.severity}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleAction(item.entityType, item.entityId, "reviewed")} disabled={takeAction.isPending}>Mark reviewed</Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction(item.entityType, item.entityId, "replacement_requested")} disabled={takeAction.isPending}>Request replacement</Button>
                  <Button size="sm" onClick={() => handleAction(item.entityType, item.entityId, "renewal_in_progress")} disabled={takeAction.isPending}>Start renewal</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleAction(item.entityType, item.entityId, "resolved")} disabled={takeAction.isPending}>Resolve</Button>
                </div>
              </div>
            )) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No current compliance items require action.</p>}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Priority snapshot</CardTitle>
              <CardDescription>Dashboard alerts remain visible here so HR can compare overall risk with the action queue.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboard.data?.alerts?.length ? dashboard.data.alerts.map((alert, index) => (
                <div key={`${alert.title}-${index}`} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="font-medium text-slate-900">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
                </div>
              )) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No open compliance alerts are currently flagged.</p>}
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Reminder activity</CardTitle>
              <CardDescription>Reminder digests are deduplicated and logged here so HR can see what has already been sent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reminders.length ? reminders.map(reminder => (
                <div key={reminder.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{reminder.title}</p>
                    <Badge className="border-slate-200 bg-slate-50 text-slate-700">{reminderTypeLabels[reminder.reminderType as keyof typeof reminderTypeLabels] ?? reminder.reminderType}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{reminder.content}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">Sent {new Date(reminder.sentAt).toLocaleString()}</p>
                </div>
              )) : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No reminder digests have been sent yet for the current scope.</p>}
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Queue guidance</CardTitle>
              <CardDescription>Use these workflow states consistently so reminders and operations stay aligned.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-500">
              <p><span className="font-medium text-slate-900">Reviewed</span> confirms the item has been checked and triaged.</p>
              <p><span className="font-medium text-slate-900">Request replacement</span> records that a newer document or evidence pack has been requested.</p>
              <p><span className="font-medium text-slate-900">Start renewal</span> advances contracts, documents, and registrations by updating the persisted due date and status.</p>
              <p><span className="font-medium text-slate-900">Resolve</span> closes the workflow once the record is no longer at risk.</p>
            </CardContent>
          </Card>
        </div>
      </div>
      {openItems.length ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Open item focus list</CardTitle>
            <CardDescription>These items have not yet been moved beyond the initial open state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {openItems.map(item => (
              <div key={`open-${item.entityType}-${item.entityId}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.employeeName} · due {item.dueDate ?? "Not set"}</p>
                </div>
                <Badge className={item.severity === "high" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700"}>{item.severity}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function TesterHelpPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        title="Pilot tester help"
        description="This in-app guide links the main role-specific validation paths and provides downloadable scenario packs so internal testers can exercise the highest-value workflows consistently."
      />

      <PilotGuidance title="How to use this workspace during the pilot">
        <p>Begin with the route that matches the role you want to validate, then follow the matching scenario pack so the expected scope and action permissions remain clear throughout the session.</p>
        <p>Use the downloadable packs when you need a reusable handoff for another internal tester or a repeatable reference during regression checks.</p>
      </PilotGuidance>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Role-specific validation routes</CardTitle>
          <CardDescription>These entry points reflect the most useful first screen for each pilot persona.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pilotRoleFlows.map(flow => (
            <div key={`${flow.role}-${flow.route}`} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium text-slate-900">{roleLabels[flow.role]} route</p>
                <p className="mt-1 text-sm text-slate-500">{flow.focus}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="border-slate-200 bg-slate-50 text-slate-700">{flow.route}</Badge>
                <a href={flow.route} className="inline-flex items-center rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  Open route
                </a>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Downloadable pilot packs</CardTitle>
          <CardDescription>Use these ready-to-download files for repeatable role checks, seeded scenario walkthroughs, and CSV administration validation.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {downloadablePilotPacks.map(pack => (
            <div key={pack.fileName} className="rounded-2xl border border-slate-200 p-4">
              <p className="font-medium text-slate-900">{pack.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{pack.description}</p>
              <Button className="mt-4 rounded-2xl" variant="outline" onClick={() => downloadTextFile(pack.fileName, pack.content, pack.fileName.endsWith(".csv") ? "text/csv;charset=utf-8" : "text/markdown;charset=utf-8") }>
                <Download className="mr-2 h-4 w-4" />
                Download pack
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Highest-risk pilot paths</CardTitle>
          <CardDescription>These are the recommended flows to repeat before wider internal rollout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
          <p><strong className="text-slate-900">Bulk administration:</strong> validate export, human-friendly CSV import, persistent summaries, and downloadable row-error reporting from the employee workspace.</p>
          <p><strong className="text-slate-900">Role scoping:</strong> confirm manager and employee impersonation only expose permitted navigation items and direct-route restrictions remain enforced.</p>
          <p><strong className="text-slate-900">Operational workflows:</strong> verify leave approvals and compliance actions remain auditable after each state transition.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function UserAccessPage() {
  const utils = trpc.useUtils();
  const users = trpc.hr.access.users.useQuery();
  const updateRole = trpc.hr.access.updateRole.useMutation({
    onSuccess: async () => {
      toast.success("User role updated.");
      await utils.hr.access.users.invalidate();
      await utils.hr.audit.list.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <PageIntro title="Role administration" description="Only administrators can access this screen. Role assignments are updated through protected procedures and logged to the immutable audit trail." />
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-3 p-6">
          {users.data?.map(user => (
            <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-slate-900">{user.name}</p>
                <p className="text-sm text-slate-500">{user.email} · {user.scopeSummary}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="border-slate-200 bg-slate-50 text-slate-700">{user.role}</Badge>
                <Select value={user.role} onValueChange={value => updateRole.mutate({ userId: user.id, role: value as "admin" | "hr" | "manager" })}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function AccessDeniedPage() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Card className="max-w-xl border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">Access restricted</h3>
          <p className="text-sm leading-7 text-slate-500">This route is protected by frontend role guards. If you believe this is incorrect, update the role assignment and matching backend permissions before retrying.</p>
        </CardContent>
      </Card>
    </div>
  );
}
