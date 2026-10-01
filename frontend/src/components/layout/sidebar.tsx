import { useEffect } from "react";
import { NavLink, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { sidebarSections, type NavItem } from "@/config/nav";
import { useAiToolsNav } from "@/config/use-ai-tools-nav";
import { usePlatformConfig } from "@/config/use-platform-config";
import { useUiStore } from "@/stores/ui-store";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/common/brand-mark";
import { Button } from "@/components/ui/button";

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      end={item.href === "/app"}
      title={collapsed ? item.title : undefined}
      aria-disabled={item.disabled}
      onClick={(e) => item.disabled && e.preventDefault()}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
          isActive &&
            "bg-accent font-medium text-accent-foreground before:absolute before:-left-2 before:bottom-1.5 before:top-1.5 before:w-[3px] before:rounded-full before:bg-brass before:content-['']",
          item.disabled && "pointer-events-none opacity-50",
          collapsed && "justify-center px-2",
        )
      }
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
      {!collapsed && item.badge && <Badge variant="secondary">{item.badge}</Badge>}
    </NavLink>
  );
}

/** Shared between the desktop rail and the mobile drawer. */
function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const aiToolsFallback = sidebarSections.find((s) => s.label === "AI Tools")?.items ?? [];
  const aiToolItems = useAiToolsNav(aiToolsFallback);
  const sections = sidebarSections.map((section) =>
    section.label === "AI Tools" ? { ...section, items: aiToolItems } : section,
  );
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto p-2" aria-label="Sidebar">
      {sections.map((section) => (
        <div key={section.label}>
          {!collapsed && (
            <p className="eyebrow mb-1.5 px-3 text-[10px] text-muted-foreground">
              {section.label}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <SidebarLink key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  const platform = usePlatformConfig();
  return (
    <div className={cn("flex h-14 items-center gap-2.5 border-b px-4", collapsed && "justify-center px-2")}>
      <BrandMark className="size-6 border-current" />
      {!collapsed && (
        <span className="truncate font-display text-[15px] font-semibold tracking-tight">
          {platform.site_name}
        </span>
      )}
    </div>
  );
}

/**
 * Responsive sidebar:
 *  - md and up: persistent rail, collapsible to icons (state persisted)
 *  - below md: hidden, opens as an animated drawer with overlay
 */
export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const mobileOpen = useUiStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const { pathname } = useLocation();

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const collapsed = !sidebarOpen;

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-14" : "w-60",
        )}
      >
        <SidebarBrand collapsed={collapsed} />
        <SidebarContent collapsed={collapsed} />
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={cn("w-full justify-start gap-3 px-3 text-muted-foreground", collapsed && "justify-center px-2")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
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
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <div className="flex items-center justify-between border-b pr-2">
                <SidebarBrand collapsed={false} />
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X className="size-4" />
                </Button>
              </div>
              <SidebarContent collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
