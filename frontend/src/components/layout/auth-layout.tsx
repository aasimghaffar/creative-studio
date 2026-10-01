import { Link, Outlet } from "react-router";
import { usePlatformConfig } from "@/config/use-platform-config";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { BrandMark } from "@/components/common/brand-mark";

/**
 * Auth shell: split layout — brand panel on desktop, focused card on
 * mobile. Forms render unchanged inside the card.
 */
export function AuthLayout() {
  const platform = usePlatformConfig();
  return (
    <div className="flex min-h-svh">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-blueprint p-10 text-mist lg:flex">
        <div className="bg-grid absolute inset-0 opacity-30" aria-hidden="true" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <BrandMark tone="dark" className="border-mist text-mist" />
          <span className="font-display text-lg font-semibold tracking-tight">{platform.site_name}</span>
        </Link>
        <div className="relative">
          <p className="eyebrow text-[10.5px] text-brass">The workbench</p>
          <h2 className="mt-2 max-w-sm font-display text-3xl font-medium leading-tight">
            Logos, avatars, and tattoo flash — drafted in seconds, refined by you.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-mist/70">
            Every render lands in your history and files, ready to download,
            favorite, and reuse across your brand.
          </p>
        </div>
        <p className="relative font-mono text-[10px] uppercase tracking-[0.08em] text-mist/50">
          © {new Date().getFullYear()} {platform.site_name}
        </p>
      </aside>

      {/* Form column */}
      <div className="relative flex min-h-svh flex-1 flex-col items-center justify-center p-4 sm:p-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <Link to="/" className="mb-6 flex items-center gap-2.5 lg:hidden">
          <BrandMark className="border-current" />
          <span className="font-display text-lg font-semibold tracking-tight">{platform.site_name}</span>
        </Link>
        <div className="w-full max-w-sm rounded-md border bg-card p-6 shadow-sm sm:p-7">
          <Outlet />
        </div>
        <p className="mt-5 max-w-xs text-center font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground lg:hidden">
          The workbench for logos, avatars, and tattoo flash
        </p>
      </div>
    </div>
  );
}
