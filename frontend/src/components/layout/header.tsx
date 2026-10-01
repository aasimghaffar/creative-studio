import { Link, NavLink } from "react-router";
import { cn } from "@/lib/utils";
import { usePlatformConfig } from "@/config/use-platform-config";
import { mainNav } from "@/config/nav";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/common/brand-mark";

/** Public / marketing header used by RootLayout. */
export function Header() {
  const platform = usePlatformConfig();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark className="border-current" />
            <span className="font-display font-semibold tracking-tight">{platform.site_name}</span>
          </Link>
          <nav className="hidden items-center gap-4 md:flex" aria-label="Main">
            {mainNav.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "text-sm text-muted-foreground transition-colors hover:text-foreground",
                    isActive && "text-foreground",
                  )
                }
              >
                {item.title}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth/sign-up">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
