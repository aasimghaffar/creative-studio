import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Global search: ⌘K / Ctrl+K focuses it; typing + Enter searches your
 * Global History prompts (or the target the surface provides via
 * `searchPath`, e.g. the admin users list).
 */
export function SearchBar({
  className,
  onSearch,
  searchPath = "/app/history",
}: {
  className?: string;
  onSearch?: (query: string) => void;
  searchPath?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  function submit() {
    const q = value.trim();
    if (!q) return;
    if (onSearch) {
      onSearch(q);
      return;
    }
    navigate(`${searchPath}?q=${encodeURIComponent(q)}`);
  }

  const shortcut = useMemo(
    () => (typeof navigator !== "undefined" && /mac/i.test(navigator.platform) ? "⌘K" : "Ctrl K"),
    [],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        placeholder="Search your generations…"
        className="h-9 pl-8 pr-14"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") e.currentTarget.blur();
        }}
        aria-label="Search your generations"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground sm:block">
        {shortcut}
      </kbd>
    </div>
  );
}
