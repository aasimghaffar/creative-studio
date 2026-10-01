import { Fragment } from "react";
import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { breadcrumbLabels } from "@/config/dashboard";

function labelFor(segment: string) {
  return (
    breadcrumbLabels[segment] ??
    segment.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/**
 * Route-driven breadcrumbs: /app/projects/spring → Dashboard / Projects / Spring.
 * Labels come from config/dashboard.ts; unknown segments are title-cased.
 */
export function Breadcrumbs({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm">
        {segments.map((segment, i) => {
          const href = `/${segments.slice(0, i + 1).join("/")}`;
          const isLast = i === segments.length - 1;
          return (
            <Fragment key={href}>
              {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden="true" />}
              <li className="min-w-0">
                {isLast ? (
                  <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground" aria-current="page">
                    {i === 0 && <Home className="size-3.5 shrink-0" aria-hidden="true" />}
                    <span className="truncate">{labelFor(segment)}</span>
                  </span>
                ) : (
                  <Link
                    to={href}
                    className="flex min-w-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {i === 0 && <Home className="size-3.5 shrink-0" aria-hidden="true" />}
                    <span className="truncate">{labelFor(segment)}</span>
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
