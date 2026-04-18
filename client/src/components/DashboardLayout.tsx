import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Bell,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "wouter";

type NavigationRole = "admin" | "hr" | "manager" | "employee";

export type DashboardNavigationItem = {
  key?: string;
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: NavigationRole[];
  badge?: string;
};

type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  items: DashboardNavigationItem[];
  children: React.ReactNode;
};

function roleTone(role: string | undefined | null) {
  switch (role) {
    case "admin":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "hr":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return role === "employee"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-sky-200 bg-sky-50 text-sky-700";
  }
}

export default function DashboardLayout({ title, subtitle, items, children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const role = (user?.role ?? "employee") as NavigationRole;
  const visibleItems = items.filter(item => !item.roles || item.roles.includes(role));
  const initials = (user?.name ?? user?.email ?? "HR")
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_35%),linear-gradient(180deg,#f7f7fb_0%,#f4f6fb_45%,#eef2f9_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-[300px] shrink-0 overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur xl:block">
          <div className="border-b border-slate-200/70 px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Northstar HR
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
                {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
              </div>
              <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-16rem)] px-4 py-4">
            <nav className="space-y-2">
              {visibleItems.map(item => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link key={item.key ?? item.href} href={item.href}>
                    <div
                      className={cn(
                        "group flex items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-200",
                        isActive
                          ? "border-violet-200 bg-violet-50 text-violet-950 shadow-sm"
                          : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "rounded-xl p-2 transition-colors",
                            isActive
                              ? "bg-violet-600 text-white"
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="text-sm font-medium">{item.label}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge ? <Badge variant="secondary">{item.badge}</Badge> : null}
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          <div className="border-t border-slate-200/70 p-4">
            <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-xl">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border border-white/10 bg-white/10">
                  <AvatarFallback className="bg-white/10 text-white">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user?.name ?? "Signed-in user"}</p>
                  <p className="truncate text-xs text-slate-300">{user?.email ?? "Internal workspace"}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Badge className={cn("border", roleTone(user?.role))}>{user?.role ?? "manager"}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-xl bg-white/10 text-white hover:bg-white/20"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col gap-4">
          <header className="rounded-[2rem] border border-white/70 bg-white/75 px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Secure HR operations workspace</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  All routes and actions are role-checked.
                </div>
                <Button variant="outline" className="rounded-2xl border-slate-200 bg-white">
                  <Bell className="mr-2 h-4 w-4" />
                  Alerts
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.07)] backdrop-blur md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
