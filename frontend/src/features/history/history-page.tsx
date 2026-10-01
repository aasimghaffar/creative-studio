import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ChipGroup, EmptyState, TogglePair, type ToolHistoryItem } from "@/features/studio-kit";
import { downloadFile } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { SearchField } from "@/components/common/search-field";
import { ViewToggle, type ViewMode } from "@/components/common/view-toggle";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { TOOL_LABELS } from "@/components/common/generation-thumb";
import { HistoryEntryCard } from "./components/history-entry-card";
import { PreviewDialog } from "./components/preview-dialog";
import { downloadGenerationSvg } from "./lib";
import {
  deleteHistoryEntry,
  fetchGlobalHistory,
  regenerateHistoryEntry,
  setHistoryFavorite,
} from "./services/history-service";

const TOOL_FILTERS = ["All", "Logo", "Avatar", "Tattoo"];
const DATE_FILTERS = ["All time", "Last 24h", "Last 7 days", "Last 30 days"];

const DATE_RANGE_PARAM: Record<string, "24h" | "7d" | "30d" | undefined> = {
  "All time": undefined,
  "Last 24h": "24h",
  "Last 7 days": "7d",
  "Last 30 days": "30d",
};

export function HistoryPage() {
  const [entries, setEntries] = useState<ToolHistoryItem[]>([]);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  // Header search lands here as ?q=… — keep the filter in sync.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) setQuery(q);
  }, [searchParams]);
  const [toolFilter, setToolFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All time");
  const [sort, setSort] = useState("Latest");
  const [view, setView] = useState<ViewMode>("list");
  const [preview, setPreview] = useState<ToolHistoryItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ToolHistoryItem | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Tool / date / sort filters are server-side — each change refetches.
  useEffect(() => {
    let cancelled = false;

    fetchGlobalHistory({
      tool: toolFilter === "All" ? undefined : toolFilter.toLowerCase(),
      range: DATE_RANGE_PARAM[dateFilter],
      sort: sort === "Latest" ? "newest" : "oldest",
    })
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [toolFilter, dateFilter, sort]);

  // Prompt search stays client-side over the fetched window.
  const filtered = useMemo(
    () => entries.filter((e) => !query || e.prompt.toLowerCase().includes(query.toLowerCase())),
    [entries, query],
  );

  function toggleFavorite(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const next = !entry.favorite;
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, favorite: next } : e)));
    void setHistoryFavorite(parseInt(id, 10), next, id.includes("-") ? parseInt(id.split("-")[1] ?? "", 10) || undefined : undefined).catch(() =>
      setEntries((list) => list.map((e) => (e.id === id ? { ...e, favorite: !next } : e))),
    );
  }

  function remove(id: string) {
    const previous = entries;
    setEntries((list) => list.filter((e) => parseInt(e.id, 10) !== parseInt(id, 10)));
    void deleteHistoryEntry(parseInt(id, 10)).catch(() => setEntries(previous));
  }

  function download(entry: ToolHistoryItem) {
    if (entry.thumb.imageUrl) {
      void downloadFile(entry.thumb.imageUrl, `${entry.toolId}-${entry.id}.png`).catch(() => undefined);
    } else {
      downloadGenerationSvg(entry);
    }
  }

  /** Server-side regenerate — spends credits, lands a real new entry. */
  function regenerate(entry: ToolHistoryItem) {
    if (regeneratingId) return;
    setRegeneratingId(entry.id);
    regenerateHistoryEntry(parseInt(entry.id, 10))
      .then((fresh) => setEntries((list) => [fresh, ...list]))
      .catch(() => undefined)
      .finally(() => setRegeneratingId(null));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="All studios"
        title="Global History"
        description="Every generation across every tool — search it, filter it, bring it back."
      />

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <SearchField value={query} onChange={setQuery} placeholder="Search prompts…" className="w-full" />
        <div className="flex flex-wrap items-center gap-2">
          <ChipGroup options={TOOL_FILTERS} value={toolFilter} onChange={setToolFilter} />
          <ChipGroup options={DATE_FILTERS} value={dateFilter} onChange={setDateFilter} />
        </div>
        <div className="flex items-center justify-between gap-3 lg:ml-auto lg:justify-start">
          <TogglePair options={["Latest", "Oldest"]} value={sort} onChange={setSort} />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState hint="Nothing matches these filters. Try widening the date range or clearing the search." />
      ) : (
        <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {filtered.map((entry) => (
            <HistoryEntryCard
              key={entry.id}
              entry={entry}
              view={view}
              regenerating={regeneratingId === entry.id}
              onPreview={() => setPreview(entry)}
              onDownload={() => download(entry)}
              onToggleFavorite={() => toggleFavorite(entry.id)}
              onDelete={() => setPendingDelete(entry)}
              onRegenerate={() => regenerate(entry)}
            />
          ))}
        </div>
      )}

      <PreviewDialog entry={preview} onClose={() => setPreview(null)} onDownload={download} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete.id)}
        title="Delete generation"
        message={`Delete "${pendingDelete?.prompt.slice(0, 60) ?? ""}…" from your history? This can't be undone.`}
        confirmLabel="Delete"
        destructive
      />

      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
        Showing {filtered.length} of {entries.length} generations across {Object.keys(TOOL_LABELS).length - 1} live studios
      </p>
    </div>
  );
}
