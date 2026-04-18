import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLoginUrl } from "@/const";
import NotFound from "@/pages/NotFound";
import {
  AccessDeniedPage,
  AddEmployeePage,
  ContractsPage,
  DepartmentsPage,
  DocumentsPage,
  EmployeeProfilePage,
  EmployeesPage,
  LeavePage,
  UserAccessPage,
} from "@/pages/HRPages";
import Home, { AuditShellPage, ComplianceShellPage, hrNavigation, PilotHelpShellPage } from "@/pages/Home";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Route, Switch } from "wouter";
import { useAuth } from "./_core/hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";

type Role = "admin" | "hr" | "manager" | "employee";

function AuthGate({ children, allowedRoles }: { children: ReactNode; allowedRoles: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[linear-gradient(180deg,#f7f7fb_0%,#eef2f9_100%)]">
        <div className="rounded-[2rem] border border-white/70 bg-white/90 p-10 text-center shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-medium text-slate-500">Loading secure workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.14),transparent_35%),linear-gradient(180deg,#f7f7fb_0%,#eef2f9_100%)] p-6">
        <div className="max-w-xl rounded-[2rem] border border-white/70 bg-white/90 p-10 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-white">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight text-slate-950">
            Northstar HR workspace
          </h1>
          <p className="mt-4 text-center text-sm leading-7 text-slate-500">
            This application protects every route and every action with role-based controls. Sign in to continue to the internal HR workspace.
          </p>
          <Button className="mt-8 w-full rounded-2xl" size="lg" onClick={() => (window.location.href = getLoginUrl())}>
            Sign in securely
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role as Role)) {
    return (
      <DashboardLayout
        title="Restricted area"
        subtitle="Frontend route guards reflect the same role rules enforced on the server procedures."
        items={hrNavigation}
      >
        <AccessDeniedPage />
      </DashboardLayout>
    );
  }

  return <>{children}</>;
}

function EmployeesShell() {
  return (
    <DashboardLayout
      title="Employees"
      subtitle="Search, filter, review, and maintain employee records from a protected internal interface."
      items={hrNavigation}
    >
      <EmployeesPage />
    </DashboardLayout>
  );
}

function AddEmployeeShell() {
  return (
    <DashboardLayout
      title="Add employee"
      subtitle="Guided onboarding flow covering personal details, employment setup, contracts, and document placeholders."
      items={hrNavigation}
    >
      <AddEmployeePage />
    </DashboardLayout>
  );
}

function DepartmentsShell() {
  return (
    <DashboardLayout
      title="Departments"
      subtitle="Create and archive departments with validated administrative controls."
      items={hrNavigation}
    >
      <DepartmentsPage />
    </DashboardLayout>
  );
}

function ContractsShell() {
  return (
    <DashboardLayout
      title="Contracts"
      subtitle="Manage contract lifecycle data, renewal signals, and expiry visibility in one place."
      items={hrNavigation}
    >
      <ContractsPage />
    </DashboardLayout>
  );
}

function DocumentsShell() {
  return (
    <DashboardLayout
      title="Documents"
      subtitle="Track secure document metadata, categories, and expiry milestones for compliance workflows."
      items={hrNavigation}
    >
      <DocumentsPage />
    </DashboardLayout>
  );
}

function LeaveShell() {
  return (
    <DashboardLayout
      title="Leave workflows"
      subtitle="Submit requests, review approvals, and monitor leave activity through scoped permissions."
      items={hrNavigation}
    >
      <LeavePage />
    </DashboardLayout>
  );
}

function AccessShell() {
  return (
    <DashboardLayout
      title="Role administration"
      subtitle="Assign Admin, HR, Manager, and Employee roles through a protected control surface with backend audit logging."
      items={hrNavigation}
    >
      <UserAccessPage />
    </DashboardLayout>
  );
}

function EmployeeProfileShell(props: { params: { id: string } }) {
  return (
    <DashboardLayout
      title="Employee profile"
      subtitle="Tabbed lifecycle view with contracts, documents, leave history, and immutable audit entries."
      items={hrNavigation}
    >
      <EmployeeProfilePage {...props} />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <AuthGate allowedRoles={["admin", "hr", "manager", "employee"]}>
          <Home />
        </AuthGate>
      </Route>
      <Route path="/employees">
        <AuthGate allowedRoles={["admin", "hr", "manager", "employee"]}>
          <EmployeesShell />
        </AuthGate>
      </Route>
      <Route path="/employees/new">
        <AuthGate allowedRoles={["admin", "hr"]}>
          <AddEmployeeShell />
        </AuthGate>
      </Route>
      <Route path="/employees/:id">
        {(params: { id: string }) => (
          <AuthGate allowedRoles={["admin", "hr", "manager", "employee"]}>
            <EmployeeProfileShell params={params} />
          </AuthGate>
        )}
      </Route>
      <Route path="/departments">
        <AuthGate allowedRoles={["admin", "hr"]}>
          <DepartmentsShell />
        </AuthGate>
      </Route>
      <Route path="/contracts">
        <AuthGate allowedRoles={["admin", "hr"]}>
          <ContractsShell />
        </AuthGate>
      </Route>
      <Route path="/documents">
        <AuthGate allowedRoles={["admin", "hr"]}>
          <DocumentsShell />
        </AuthGate>
      </Route>
      <Route path="/leave">
        <AuthGate allowedRoles={["admin", "hr", "manager", "employee"]}>
          <LeaveShell />
        </AuthGate>
      </Route>
      <Route path="/access">
        <AuthGate allowedRoles={["admin"]}>
          <AccessShell />
        </AuthGate>
      </Route>
      <Route path="/pilot-help">
        <AuthGate allowedRoles={["admin", "hr", "manager", "employee"]}>
          <PilotHelpShellPage />
        </AuthGate>
      </Route>
      <Route path="/audit">
        <AuthGate allowedRoles={["admin", "hr"]}>
          <AuditShellPage />
        </AuthGate>
      </Route>
      <Route path="/compliance">
        <AuthGate allowedRoles={["admin", "hr"]}>
          <ComplianceShellPage />
        </AuthGate>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
