import { Outlet } from "react-router";
import { PageTransition } from "@/components/common/page-transition";
import { AdminSidebar } from "./components/admin-sidebar";
import { AdminHeader } from "./components/admin-header";

/** Dedicated admin shell — same design language, separate navigation & state. */
export function AdminLayout() {
  return (
    <div className="flex min-h-svh">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 p-4 md:p-6">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
