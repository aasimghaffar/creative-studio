import { useCallback, useEffect, useRef, useState } from "react";
import { invalidateCreditsSummary, useCreditsSummary } from "@/lib/use-credits-summary";
import { ApiError, downloadFile } from "@/lib/api-client";
import type { GeneratedItem, HistoryHandlers, ToolHistoryItem } from "./types";
import { createToolApi, type ToolGenerateResult } from "./tool-api";

/**
 * Generic API-backed studio state — the Logo Generator's hook,
 * parameterized so Avatar, Tattoo, and future tools get the FULL flow
 * (config, history, generate, credits, favorites, delete, regenerate,
 * downloads) without duplicating a line of it.
 */
export interface ToolStudioOptions<S extends { prompt: string; quantity: number }> {
  slug: string;
  tag: string;
  defaultSettings: S;
  /** Raw selections → request body. The backend builds the AI prompt. */
  buildPayload: (settings: S) => Record<string, unknown>;
  /** History "Open again" → which settings fields to restore. */
  restoreFromHistory?: (entry: ToolHistoryItem) => Partial<S>;
}

export function useToolStudio<S extends { prompt: string; quantity: number }>(
  options: ToolStudioOptions<S>,
) {
  const apiRef = useRef(createToolApi(options.slug, options.tag));
  const api = apiRef.current;

  const [settings, setSettings] = useState<S>(options.defaultSettings);
  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [history, setHistory] = useState<ToolHistoryItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { balance: creditsBalance, unlimited } = useCreditsSummary();
  const [creditsPerDraft, setCreditsPerDraft] = useState(0);
  const [promptLimit, setPromptLimit] = useState(1200);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    invalidateCreditsSummary();

    Promise.allSettled([api.fetchConfig(), api.fetchHistory()]).then(([config, hist]) => {
      if (cancelled) return;
      if (config.status === "fulfilled") {
        setCreditsPerDraft(config.value.creditsPerGeneration);
        setPromptLimit(config.value.promptLimit);
      } else {
        setError("Could not load tool pricing and your balance. Is the backend running?");
      }
      if (hist.status === "fulfilled") {
        setHistory(hist.value);
      } else {
        setError("Could not load your history. Is the backend running?");
      }
    });

    return () => {
      cancelled = true;
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchSettings = (patch: Partial<S>) => setSettings((s) => ({ ...s, ...patch }));

  const estimatedCost = settings.quantity * creditsPerDraft;

  const applyResult = useCallback((result: ToolGenerateResult, message: string) => {
    setItems(result.items);
    invalidateCreditsSummary();
    setHistory((h) => [result.historyEntry, ...h].slice(0, 20));
    setSuccess(message);
    window.setTimeout(() => setSuccess(null), 3500);
  }, []);

  async function handleGenerate() {
    if (generating) return;
    if (settings.prompt.length > promptLimit) {
      setError(`Prompt is limited to ${promptLimit.toLocaleString()} characters for this tool.`);
      return;
    }
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      applyResult(await api.generate(options.buildPayload(settings)), "Generated and saved to your history.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const handleRetry = () => void handleGenerate();

  const handleDownload = (item: GeneratedItem) => {
    if (!item.imageUrl) return;
    void downloadFile(item.imageUrl, `${options.slug}-${item.id}.png`).catch(() =>
      setError("Download failed. Please try again."),
    );
  };

  function handleCopyPrompt(item: GeneratedItem) {
    void navigator.clipboard?.writeText(item.prompt).catch(() => undefined);
    setCopiedId(item.id);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopiedId(null), 1600);
  }

  function handleToggleFavorite(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item?.historyId) return;
    const next = !item.favorite;
    // ids look like "gen-{generationId}-{fileId}" — favorites are per file.
    const fileId = parseInt(id.split("-").pop() ?? "", 10) || undefined;
    setItems((list) => list.map((i) => (i.id === id ? { ...i, favorite: next } : i)));
    void api.setFavorite(item.historyId, next, fileId).catch(() => {
      setItems((list) => list.map((i) => (i.id === id ? { ...i, favorite: !next } : i)));
      setError("Could not update the favorite. Please try again.");
    });
  }

  const handleDelete = (id: string) => setItems((list) => list.filter((it) => it.id !== id));

  const historyHandlers: HistoryHandlers = {
    onDownload: (entry) => {
      if (!entry.thumb.imageUrl) return;
      void downloadFile(entry.thumb.imageUrl, `${options.slug}-history-${entry.id}.png`).catch(() =>
        setError("Download failed. Please try again."),
      );
    },
    onToggleFavorite: (id) => {
      const entry = history.find((h) => h.id === id);
      if (!entry) return;
      const next = !entry.favorite;
      // Entry ids are "{historyId}-{fileId}" — favorites act on the file.
      const fileId = id.includes("-") ? parseInt(id.split("-")[1] ?? "", 10) || undefined : undefined;
      setHistory((list) => list.map((h) => (h.id === id ? { ...h, favorite: next } : h)));
      void api.setFavorite(parseInt(id, 10), next, fileId).catch(() => {
        setHistory((list) => list.map((h) => (h.id === id ? { ...h, favorite: !next } : h)));
        setError("Could not update the favorite. Please try again.");
      });
    },
    onDelete: (id) => {
      const previous = history;
      setHistory((list) => list.filter((h) => h.id !== id));
      void api.remove(Number(id)).catch(() => {
        setHistory(previous);
        setError("Could not delete the generation. Please try again.");
      });
    },
    onOpenAgain: (entry) => {
      const restore = options.restoreFromHistory?.(entry) ?? ({
        prompt: entry.prompt,
      } as Partial<S>);
      patchSettings(restore);
    },
  };

  async function handleRegenerate(entry: ToolHistoryItem) {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      applyResult(await api.regenerate(parseInt(entry.id, 10)), "Regenerated with the original settings.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Regeneration failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return {
    promptLimit,
    settings,
    patchSettings,
    items,
    history,
    generating,
    error,
    success,
    copiedId,
    creditsBalance,
    creditsPerDraft,
    unlimited,
    estimatedCost,
    handleGenerate,
    handleRetry,
    handleRegenerate,
    handleDownload,
    handleCopyPrompt,
    handleToggleFavorite,
    handleDelete,
    historyHandlers,
  };
}
