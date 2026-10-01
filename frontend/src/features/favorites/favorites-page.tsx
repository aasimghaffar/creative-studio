import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Check, Copy, Download, Heart, RotateCcw } from "lucide-react";
import { EmptyState, formatDateTime } from "@/features/studio-kit";
import type { FavoritePrompt } from "@/mocks";
import { downloadFile } from "@/lib/api-client";
import { PageHeader } from "@/components/common/page-header";
import { SearchField } from "@/components/common/search-field";
import { TabNav } from "@/components/common/tab-nav";
import { GenerationThumb, TOOL_LABELS } from "@/components/common/generation-thumb";
import { downloadGenerationSvg } from "@/features/history";
import { fetchFavorites, removeFavorite, type FavoriteImageItem } from "./services/favorite-service";

const TOOL_ROUTES: Record<string, string> = {
  logo: "/app/logos",
  avatar: "/app/avatars",
  tattoo: "/app/tattoos",
};

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-[3px] border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

export function FavoritesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("images");
  const [query, setQuery] = useState("");
  const [images, setImages] = useState<FavoriteImageItem[]>([]);
  const [prompts, setPrompts] = useState<FavoritePrompt[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFavorites()
      .then((data) => {
        if (cancelled) return;
        setImages(data.images);
        setPrompts(data.prompts);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function removeImage(entry: FavoriteImageItem) {
    const previous = images;
    setImages((list) => list.filter((i) => i.id !== entry.id));
    void removeFavorite(entry.favoriteId).catch(() => setImages(previous));
  }

  function removePrompt(entry: FavoritePrompt) {
    const previous = prompts;
    setPrompts((list) => list.filter((p) => p.id !== entry.id));
    void removeFavorite(Number(entry.id)).catch(() => setPrompts(previous));
  }

  function downloadImage(entry: FavoriteImageItem) {
    if (entry.thumb.imageUrl) {
      void downloadFile(entry.thumb.imageUrl, `${entry.toolId}-favorite-${entry.id}.png`).catch(
        () => undefined,
      );
    } else {
      downloadGenerationSvg(entry);
    }
  }

  const q = query.toLowerCase();
  const filteredImages = useMemo(() => images.filter((i) => i.prompt.toLowerCase().includes(q)), [images, q]);
  const filteredPrompts = useMemo(() => prompts.filter((p) => p.prompt.toLowerCase().includes(q)), [prompts, q]);

  function copyPrompt(entry: FavoritePrompt) {
    void navigator.clipboard?.writeText(entry.prompt).catch(() => undefined);
    setCopiedId(entry.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  const openAgain = (toolId: string) => navigate(TOOL_ROUTES[toolId] ?? "/app");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Saved"
        title="Favorites"
        description="The keepers — generations and prompts you've starred across every studio."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <TabNav
          tabs={[
            { id: "images", label: `Images (${images.length})` },
            { id: "prompts", label: `Prompts (${prompts.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Search favorites…" className="w-full" />
      </div>

      {tab === "images" &&
        (filteredImages.length === 0 ? (
          <EmptyState icon={Heart} hint="No favorite images yet. Tap the heart on any generation to keep it here." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredImages.map((entry) => (
              <article key={entry.id} className="rounded-[4px] border bg-card p-3">
                <GenerationThumb item={entry} size="lg" />
                <p className="mt-2.5 truncate text-sm">{entry.prompt}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                  {TOOL_LABELS[entry.toolId] ?? entry.toolId} · {formatDateTime(entry.createdAt)}
                </p>
                <div className="mt-3 flex items-center justify-end gap-1.5 border-t pt-2.5">
                  <IconAction label="Download" onClick={() => downloadImage(entry)}>
                    <Download className="size-3.5" strokeWidth={1.6} />
                  </IconAction>
                  <IconAction label="Open again" onClick={() => openAgain(entry.toolId)}>
                    <RotateCcw className="size-3.5" strokeWidth={1.6} />
                  </IconAction>
                  <IconAction
                    label="Remove from favorites"
                    onClick={() => removeImage(entry)}
                  >
                    <Heart className="size-3.5 fill-brass text-brass" strokeWidth={1.6} />
                  </IconAction>
                </div>
              </article>
            ))}
          </div>
        ))}

      {tab === "prompts" &&
        (filteredPrompts.length === 0 ? (
          <EmptyState icon={Heart} hint="No favorite prompts yet. Save the wording that works and reuse it anywhere." />
        ) : (
          <div className="space-y-2">
            {filteredPrompts.map((entry) => (
              <article
                key={entry.id}
                className="flex items-center gap-3.5 rounded-[4px] border bg-card p-3 transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">{entry.prompt}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.04em] text-muted-foreground">
                    {TOOL_LABELS[entry.toolId] ?? entry.toolId} · saved {formatDateTime(entry.savedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <IconAction label={copiedId === entry.id ? "Copied" : "Copy prompt"} onClick={() => copyPrompt(entry)}>
                    {copiedId === entry.id ? (
                      <Check className="size-3.5 text-teal" strokeWidth={2} />
                    ) : (
                      <Copy className="size-3.5" strokeWidth={1.6} />
                    )}
                  </IconAction>
                  <IconAction label="Open again" onClick={() => openAgain(entry.toolId)}>
                    <RotateCcw className="size-3.5" strokeWidth={1.6} />
                  </IconAction>
                  <IconAction
                    label="Remove from favorites"
                    onClick={() => removePrompt(entry)}
                  >
                    <Heart className="size-3.5 fill-brass text-brass" strokeWidth={1.6} />
                  </IconAction>
                </div>
              </article>
            ))}
          </div>
        ))}
    </div>
  );
}
