import { useState } from "react";
import { Menu, PanelRight, Search } from "lucide-react";
import { useCreditsSummary } from "@/lib/use-credits-summary";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { SearchBar } from "@/components/common/search-bar";
import { NotificationsMenu } from "@/components/common/notifications-menu";
import { CreditsMeter } from "@/components/common/credits-meter";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { UserMenu } from "@/features/auth";

/**
 * Dashboard topbar: breadcrumbs + global actions.
 * Placeholder data (notifications, credits) is injected here — the widget
 * components themselves are source-agnostic and reusable.
 */
export function DashboardHeader() {
  const summary = useCreditsSummary();
  const liveCredits = {
    plan: "—",
    used: summary.used_total,
    total: summary.total_granted,
    balance: summary.balance,
    unlimited: summary.unlimited,
    renewsOn: summary.resets_on ? new Date(summary.resets_on.replace(" ", "T")).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—",
  };
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel);
  const rightPanelOpen = useUiStore((s) => s.rightPanelOpen);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-4">
      {/* Mobile: open drawer */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </Button>

      <Breadcrumbs className="min-w-0 flex-1 truncate sm:flex-none" />

      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <SearchBar className="hidden w-56 lg:block xl:w-64" />
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Search"
          aria-expanded={mobileSearchOpen}
          onClick={() => setMobileSearchOpen((v) => !v)}
        >
          <Search className="size-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

        <div className="hidden sm:block"><CreditsMeter credits={liveCredits} /></div>
        <NotificationsMenu />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleRightPanel}
          aria-label={rightPanelOpen ? "Close activity panel" : "Open activity panel"}
          aria-pressed={rightPanelOpen}
          className={`hidden lg:inline-flex ${rightPanelOpen ? "bg-accent" : ""}`}
        >
          <PanelRight className="size-4" />
        </Button>
        <div className="hidden sm:block"><div className="hidden sm:block"><ThemeToggle /></div></div>

        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

        <UserMenu />
      </div>
      {mobileSearchOpen && (
        <div className="absolute inset-x-0 top-full border-b bg-background p-2 lg:hidden">
          <SearchBar className="w-full" />
        </div>
      )}
    </header>
  );
}
