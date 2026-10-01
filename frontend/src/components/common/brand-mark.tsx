import { cn } from "@/lib/utils";

/**
 * Brand mark: the provided studio logo icon, theme-aware.
 * - public/brand-icon.svg       -> light surfaces
 * - public/brand-icon-dark.svg  -> dark surfaces
 * `tone="dark"` forces the dark-background variant (for surfaces that are
 * always dark regardless of theme, e.g. the auth split panel). Otherwise
 * the variant follows the app theme via the `dark:` classes.
 */
export function BrandMark({
  className,
  tone,
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const base = "size-[26px] shrink-0 select-none object-contain";
  if (tone === "dark") {
    return <img src="/brand-icon-dark.svg" alt="" aria-hidden="true" className={cn(base, className)} draggable={false} />;
  }
  if (tone === "light") {
    return <img src="/brand-icon.svg" alt="" aria-hidden="true" className={cn(base, className)} draggable={false} />;
  }
  return (
    <>
      <img src="/brand-icon.svg" alt="" aria-hidden="true" className={cn(base, "dark:hidden", className)} draggable={false} />
      <img src="/brand-icon-dark.svg" alt="" aria-hidden="true" className={cn(base, "hidden dark:block", className)} draggable={false} />
    </>
  );
}
