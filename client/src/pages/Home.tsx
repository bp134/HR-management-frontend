import DashboardLayout, { DashboardNavigationItem } from "@/components/DashboardLayout";
import { AuditPage, CompliancePage, DashboardPage, TesterHelpPage } from "@/pages/HRPages";
import {
  BadgeCheck,
  Building2,
  CalendarRange,
  ClipboardList,
  FileBadge2,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

export const hrNavigation: DashboardNavigationItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "hr", "manager", "employee"] },
  { label: "Employees", href: "/employees", icon: Users, roles: ["admin", "hr", "manager", "employee"], badge: "Self-service" },
  { label: "Add employee", href: "/employees/new", icon: UserPlus, roles: ["admin", "hr"] },
  { label: "Departments", href: "/departments", icon: Building2, roles: ["admin", "hr"] },
  { label: "Contracts", href: "/contracts", icon: FileText, roles: ["admin", "hr"] },
  { label: "Documents", href: "/documents", icon: FileBadge2, roles: ["admin", "hr"] },
  { label: "Leave", href: "/leave", icon: CalendarRange, roles: ["admin", "hr", "manager", "employee"] },
  { key: "pilot-help", label: "Pilot help", href: "/pilot-help", icon: LifeBuoy, roles: ["admin", "hr", "manager", "employee"], badge: "Guide" },
  { label: "Access", href: "/access", icon: ShieldCheck, roles: ["admin"], badge: "Admin" },
  { key: "audit-log", label: "Audit", href: "/audit", icon: ClipboardList, roles: ["admin", "hr"] },
  { key: "compliance-tracked", label: "Compliance", href: "/compliance", icon: BadgeCheck, roles: ["admin", "hr"], badge: "Tracked" },
];

export default function Home() {
  return (
    <DashboardLayout
      title="HR management"
      subtitle="An elegant internal workspace for onboarding, leave management, contracts, document compliance, and lifecycle oversight."
      items={hrNavigation}
    >
      <DashboardPage />
    </DashboardLayout>
  );
}

export function AuditShellPage() {
  return (
    <DashboardLayout
      title="Audit log"
      subtitle="Immutable operational history with actor identity, role-aware access, timestamps, and field-level change visibility."
      items={hrNavigation}
    >
      <AuditPage />
    </DashboardLayout>
  );
}

export function ComplianceShellPage() {
  return (
    <DashboardLayout
      title="Compliance oversight"
      subtitle="Monitor expiring contracts, document coverage, and professional registration readiness through a dedicated compliance workspace."
      items={hrNavigation}
    >
      <CompliancePage />
    </DashboardLayout>
  );
}

export function PilotHelpShellPage() {
  return (
    <DashboardLayout
      title="Pilot tester help"
      subtitle="Role-specific entry routes, reusable scenario packs, and quick-start guidance for the internal rollout."
      items={hrNavigation}
    >
      <TesterHelpPage />
    </DashboardLayout>
  );
}
