import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { NavItem } from "@/config/nav";
import { AI_TOOL_LINKS } from "@/config/nav";

/**
 * Dynamic AI Tools navigation — the sidebar mirrors the ai_tools table.
 * Live tools are clickable; everything else renders the existing
 * "Soon" badge. Cached per session so the sidebar doesn't refetch on
 * every route change.
 */

interface ApiCatalogTool {
  slug: string;
  name: string;
  status: "live" | "coming_soon";
}

let cache: ApiCatalogTool[] | null = null;
let inflight: Promise<ApiCatalogTool[]> | null = null;

function load(): Promise<ApiCatalogTool[]> {
  if (cache) return Promise.resolve(cache);
  inflight ??= apiRequest<{ tools: ApiCatalogTool[] }>("/v1/ai/tools").then((d) => {
    cache = d.tools;
    inflight = null;
    return d.tools;
  });
  return inflight;
}

/** Exposed for tests / manual refresh after admin changes. */
export function invalidateAiToolsNav(): void {
  cache = null;
}

export function useAiToolsNav(fallback: NavItem[]): NavItem[] {
  const [items, setItems] = useState<NavItem[]>(fallback);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((tools) => {
        if (cancelled) return;
        const mapped = tools.flatMap((t): NavItem[] => {
          const link = AI_TOOL_LINKS[t.slug];
          if (!link) return [];
          return [
            t.status === "live"
              ? { title: t.name, href: link.href, icon: link.icon }
              : { title: t.name, href: link.href, icon: link.icon, disabled: true, badge: "Soon" },
          ];
        });
        if (mapped.length > 0) setItems(mapped);
      })
      .catch(() => undefined); // fallback stays — sidebar never breaks
    return () => {
      cancelled = true;
    };
  }, []);

  return items;
}
