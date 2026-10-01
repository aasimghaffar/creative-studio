import { Outlet } from "react-router";
import { Wrench } from "lucide-react";
import { Sidebar } from "./sidebar";
import { DashboardHeader } from "./dashboard-header";
import { RightPanel } from "./right-panel";
import { PageTransition } from "@/components/common/page-transition";
import { usePlatformConfig } from "@/config/use-platform-config";
import { useAuthStore } from "@/features/auth/stores/auth-store";

/**
 * Authenticated product shell:
 *
 *   ┌─────────┬──────────────────────────────┐
 *   │         │  DashboardHeader             │
 *   │ Sidebar ├───────────────────┬──────────┤
 *   │         │  Main (Outlet)    │ RightPanel (optional)
 *   └─────────┴───────────────────┴──────────┘
 *
 * Sidebar: collapsible rail on md+, drawer below. RightPanel: inline on xl+,
 * slide-over below. All shell state lives in the UI store.
 *
 * Maintenance mode (admin → General Settings) replaces the workspace for
 * every non-admin user; the backend enforces the same rule with 503s.
 */
export function AppLayout() {
  const platform = usePlatformConfig();
  const user = useAuthStore((s) => s.user);
  const underMaintenance = platform.maintenance_mode && user?.role !== "admin";

  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader />
        <div className="flex flex-1">
          <main className="min-w-0 flex-1 p-4 md:p-6">
            {underMaintenance ? (
              <div className="mx-auto grid max-w-md place-items-center py-24 text-center">
                <span className="grid size-14 place-items-center rounded-full border border-brass/50 bg-brass/10">
                  <Wrench className="size-6 text-brass" strokeWidth={1.6} />
                </span>
                <h1 className="mt-5 font-display text-xl font-semibold tracking-tight">
                  {platform.site_name} is under maintenance
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  We are making improvements and will be back shortly. Your work and credits are safe — please check back soon.
                </p>
              </div>
            ) : (
              <PageTransition>
                <Outlet />
              </PageTransition>
            )}
          </main>
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
