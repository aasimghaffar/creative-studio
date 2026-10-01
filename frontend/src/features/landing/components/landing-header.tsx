import { useEffect, useState } from "react";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import { homeRouteFor } from "@/features/auth/lib/home-route";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatformConfig } from "@/config/use-platform-config";
import { BrandMark } from "@/components/common/brand-mark";
import { landingNav } from "../data";

export function LandingHeader() {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");
  const user = useAuthStore((s) => s.user);
  const platform = usePlatformConfig();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300",
        scrolled ? "border-paper-line bg-paper/90 backdrop-blur-md" : "border-transparent bg-paper",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label={`${platform.site_name} home`}>
          <BrandMark />
          <span className="font-display text-[19px] font-semibold tracking-tight text-ink">
            {platform.site_name}
          </span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Main">
          {landingNav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {item.title}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <Link to={homeRouteFor(user)} className="text-sm text-ink-soft transition-colors hover:text-ink">
              Dashboard
            </Link>
          ) : (
          <Link to="/auth/sign-in" className="text-sm text-ink-soft transition-colors hover:text-ink">
            Sign in
          </Link>
          )}
          <Link
            to="/auth/sign-up"
            className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-brass-deep"
          >
            Try Tools →
          </Link>
        </div>

        <button
          type="button"
          className="grid size-9 place-items-center rounded-sm text-ink hover:bg-paper-hover lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden border-b border-paper-line bg-paper lg:hidden"
            aria-label="Mobile"
          >
            <div className="space-y-1 px-4 py-4">
              {landingNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-sm px-3 py-2.5 text-[15px] text-ink-soft hover:bg-paper-hover hover:text-ink"
                >
                  {item.title}
                </a>
              ))}
              <div className="flex gap-3 pt-3">
                <Link
                  to="/auth/sign-in"
                  className="flex-1 rounded-sm border border-ink py-2.5 text-center text-sm text-ink"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth/sign-up"
                  className="flex-1 rounded-sm bg-ink py-2.5 text-center text-sm font-medium text-paper"
                >
                  Try Tools →
                </Link>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
