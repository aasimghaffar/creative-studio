import { useEffect, useRef, useState } from "react";
import { CREDITS_PER_DRAFT, mockUserCredits } from "@/mocks/user-credits";
import { shade } from "./lib";
import type {
  BaseSettings,
  GeneratedItem,
  HistoryHandlers,
  SvgSource,
  ToolHistoryItem,
} from "./types";

interface UseStudioOptions<S extends BaseSettings> {
  /** Stable id — keys this studio's history and templates ("logo", "avatar", …). */
  toolId: string;
  defaultSettings: S;
  initialItems?: GeneratedItem[];
  initialHistory?: ToolHistoryItem[];
  /** The (mock) generation service — swap for a real API without UI changes. */
  generate: (settings: S) => Promise<GeneratedItem[]>;
  /** Builds a downloadable SVG from an item or a history thumb. */
  toSvg: (source: SvgSource) => string;
  filePrefix: string;
  creditsPerDraft?: number;
}

function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Shared state + actions for every studio workbench: settings, generation,
 * per-tool rich history, credits, favorites, copy-prompt, delete, download.
 */
export function useStudio<S extends BaseSettings>({
  toolId,
  defaultSettings,
  initialItems = [],
  initialHistory = [],
  generate,
  toSvg,
  filePrefix,
  creditsPerDraft = CREDITS_PER_DRAFT,
}: UseStudioOptions<S>) {
  const [settings, setSettings] = useState<S>(defaultSettings);
  const [items, setItems] = useState<GeneratedItem[]>(initialItems);
  const [history, setHistory] = useState<ToolHistoryItem[]>(initialHistory);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [creditsBalance, setCreditsBalance] = useState(mockUserCredits.balance);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  const estimatedCost = settings.quantity * creditsPerDraft;

  const patchSettings = (patch: Partial<S>) => setSettings((s) => ({ ...s, ...patch }));

  async function handleGenerate() {
    setGenerating(true);
    const batch = await generate(settings);
    setItems(batch);
    setCreditsBalance((b) => Math.max(0, b - estimatedCost));
    setHistory((h) =>
      [
        {
          id: crypto.randomUUID(),
          toolId,
          prompt: settings.prompt,
          style: settings.style,
          color: settings.color,
          ratio: settings.ratio,
          createdAt: new Date().toISOString(),
          creditsUsed: estimatedCost,
          status: "completed" as const,
          favorite: false,
          thumb: {
            colors: [settings.color, shade(settings.color, 0.55)] as [string, string],
            variant: 0,
          },
        },
        ...h,
      ].slice(0, 8),
    );
    setGenerating(false);
  }

  /* ---------- Result actions ---------- */

  const handleDownload = (item: GeneratedItem) =>
    downloadSvg(toSvg(item), `${item.tag.toLowerCase()}-${filePrefix}.svg`);

  function handleCopyPrompt(item: GeneratedItem) {
    void navigator.clipboard?.writeText(item.prompt).catch(() => undefined);
    setCopiedId(item.id);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopiedId(null), 1600);
  }

  const handleToggleFavorite = (id: string) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, favorite: !it.favorite } : it)));

  const handleDelete = (id: string) => setItems((list) => list.filter((it) => it.id !== id));

  /* ---------- History actions ---------- */

  const historyHandlers: HistoryHandlers = {
    onDownload: (entry) =>
      downloadSvg(
        toSvg({ prompt: entry.prompt, colors: entry.thumb.colors, variant: entry.thumb.variant }),
        `history-${filePrefix}-${entry.id.slice(0, 6)}.svg`,
      ),
    onToggleFavorite: (id) =>
      setHistory((list) => list.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e))),
    onDelete: (id) => setHistory((list) => list.filter((e) => e.id !== id)),
    onOpenAgain: (entry) =>
      patchSettings({
        prompt: entry.prompt,
        style: entry.style,
        color: entry.color,
        ratio: entry.ratio,
      } as Partial<S>),
  };

  return {
    settings,
    patchSettings,
    items,
    history,
    generating,
    copiedId,
    creditsBalance,
    estimatedCost,
    handleGenerate,
    handleDownload,
    handleCopyPrompt,
    handleToggleFavorite,
    handleDelete,
    historyHandlers,
  };
}
