import { useEffect } from "react";
import { NavLink, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatformConfig } from "@/config/use-platform-config";
import { useUiStore } from "@/stores/ui-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/common/brand-mark";
import { adminNav, type AdminNavItem } from "../nav";

function AdminLink({ item, collapsed }: { item: AdminNavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      end={item.href === "/admin"}
      title={collapsed ? item.title : undefined}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
          isActive &&
            "bg-accent font-medium text-accent-foreground before:absolute before:-left-2 before:bottom-1.5 before:top-1.5 before:w-[3px] before:rounded-full before:bg-brass before:content-['']",
          collapsed && "justify-center px-2",
        )
      }
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.6} />
      {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
    </NavLink>
  );
}

function AdminBrand({ collapsed }: { collapsed: boolean }) {
  const platform = usePlatformConfig();
  return (
    <div className={cn("flex h-14 shrink-0 items-center gap-2.5 border-b px-4", collapsed && "justify-center px-2")}>
      <BrandMark className="size-6 border-current" />
      {!collapsed && (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-display text-[15px] font-semibold tracking-tight">{platform.site_name}</span>
          <Badge className="border-transparent bg-brass font-mono text-[9px] text-blueprint">ADMIN</Badge>
        </span>
      )}
    </div>
  );
}

function AdminNavContent({ collapsed }: { collapsed: boolean }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto p-2" aria-label="Admin sidebar">
      {adminNav.map((section) => (
        <div key={section.label}>
          {!collapsed && (
            <p className="eyebrow mb-1.5 px-3 text-[10px] text-muted-foreground">{section.label}</p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <AdminLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Admin sidebar: collapsible rail on md+, animated drawer below. */
export function AdminSidebar() {
  const open = useUiStore((s) => s.adminSidebarOpen);
  const toggle = useUiStore((s) => s.toggleAdminSidebar);
  const mobileOpen = useUiStore((s) => s.adminMobileSidebarOpen);
  const setMobileOpen = useUiStore((s) => s.setAdminMobileSidebarOpen);
  const { pathname } = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const collapsed = !open;

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-14" : "w-64",
        )}
      >
        <AdminBrand collapsed={collapsed} />
        <AdminNavContent collapsed={collapsed} />
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className={cn("w-full justify-start gap-3 px-3 text-muted-foreground", collapsed && "justify-center px-2")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-sidebar text-sidebar-foreground md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
            >
              <div className="flex items-center justify-between border-b pr-2">
                <AdminBrand collapsed={false} />
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X className="size-4" />
                </Button>
              </div>
              <AdminNavContent collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
