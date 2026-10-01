import { Menu, Search } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { SearchBar } from "@/components/common/search-bar";
import { NotificationsMenu } from "@/components/common/notifications-menu";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { UserMenu } from "@/features/auth";

/** Admin topbar: breadcrumb, global search, alerts, theme, admin profile. */
export function AdminHeader() {
  const setMobileOpen = useUiStore((s) => s.setAdminMobileSidebarOpen);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open admin navigation"
      >
        <Menu className="size-4" />
      </Button>

      <Breadcrumbs className="min-w-0 flex-1 sm:flex-none" />

      <div className="ml-auto flex items-center gap-1">
        <SearchBar className="hidden w-56 lg:block xl:w-64" searchPath="/admin/users" />
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Search">
          <Search className="size-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

        <NotificationsMenu />
        <ThemeToggle />

        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

        <UserMenu />
      </div>
    </header>
  );
}
