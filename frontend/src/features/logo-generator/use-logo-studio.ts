import { useCallback, useEffect, useRef, useState } from "react";
import { invalidateCreditsSummary, useCreditsSummary } from "@/lib/use-credits-summary";
import { ApiError, downloadFile } from "@/lib/api-client";
import type { GeneratedItem, HistoryHandlers, ToolHistoryItem } from "@/features/studio-kit";
import type { LogoSettings } from "./types";
import { defaultSettings } from "./data";
import {
  deleteLogoGeneration,
  fetchLogoConfig,
  fetchLogoHistory,
  generateLogos,
  regenerateLogo,
  setLogoFavorite,
} from "./services/generation-service";

/**
 * API-backed studio state for the Logo Generator. Mirrors the shape the
 * existing Workbench / PromptPanel / ResultsPanel already consume — the
 * UI doesn't know the mock is gone.
 */
export function useLogoStudio() {
  const [settings, setSettings] = useState<LogoSettings>(defaultSettings);
  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [history, setHistory] = useState<ToolHistoryItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Balance comes from the ONE shared summary — the same number the
  // header meter and dashboard show. Any invalidation (generation,
  // plan change, admin adjustment + refresh) updates this footer too.
  const { balance: creditsBalance, unlimited } = useCreditsSummary();
  const [creditsPerDraft, setCreditsPerDraft] = useState(0);
  const [promptLimit, setPromptLimit] = useState(1200);
  const copiedTimer = useRef<number | null>(null);

  // Initial load: tool config (cost + balance) and real history.
  useEffect(() => {
    let cancelled = false;

    // Fresh figures on every visit to the studio.
    invalidateCreditsSummary();

    Promise.allSettled([fetchLogoConfig(), fetchLogoHistory()]).then(([config, hist]) => {
      if (cancelled) return;
      if (config.status === "fulfilled") {
        setCreditsPerDraft(config.value.creditsPerGeneration);
        setPromptLimit(config.value.promptLimit);
      } else {
        // Never fall back silently to stale numbers — say so.
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
  }, []);

  const patchSettings = (patch: Partial<LogoSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const estimatedCost = settings.quantity * creditsPerDraft;

  const applyResult = useCallback(
    (result: Awaited<ReturnType<typeof generateLogos>>, message: string) => {
      setItems(result.items);
      invalidateCreditsSummary();
      setHistory((h) => [result.historyEntry, ...h].slice(0, 20));
      setSuccess(message);
      window.setTimeout(() => setSuccess(null), 3500);
    },
    [],
  );

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
      applyResult(await generateLogos(settings), "Logos generated and saved to your history.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  /** Retry = re-run the current form settings. */
  const handleRetry = () => void handleGenerate();

  /* ---------- Canvas item actions ---------- */

  const handleDownload = (item: GeneratedItem) => {
    if (!item.imageUrl) return;
    void downloadFile(item.imageUrl, `logo-${item.id}.png`).catch(() =>
      setError("Download failed. Please try again."),
    );
  };

  function handleCopyPrompt(item: GeneratedItem) {
    void navigator.clipboard?.writeText(item.prompt).catch(() => undefined);
    setCopiedId(item.id);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopiedId(null), 1600);
  }

  /** Canvas favorite — per generated image (file-level). */
  function handleToggleFavorite(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item?.historyId) return;

    const next = !item.favorite;
    // ids look like "gen-{generationId}-{fileId}" — favorites are per file.
    const fileId = parseInt(id.split("-").pop() ?? "", 10) || undefined;
    setItems((list) => list.map((i) => (i.id === id ? { ...i, favorite: next } : i)));
    void setLogoFavorite(item.historyId, next, fileId).catch(() => {
      setItems((list) => list.map((i) => (i.id === id ? { ...i, favorite: !next } : i)));
      setError("Could not update the favorite. Please try again.");
    });
  }

  const handleDelete = (id: string) => setItems((list) => list.filter((it) => it.id !== id));

  /* ---------- History actions (server-backed) ---------- */

  const historyHandlers: HistoryHandlers = {
    onDownload: (entry) => {
      if (!entry.thumb.imageUrl) return;
      void downloadFile(entry.thumb.imageUrl, `logo-history-${entry.id}.png`).catch(() =>
        setError("Download failed. Please try again."),
      );
    },
    onToggleFavorite: (id) => {
      const entry = history.find((h) => h.id === id);
      if (!entry) return;
      const next = !entry.favorite;
      const fileId = id.includes("-") ? parseInt(id.split("-")[1] ?? "", 10) || undefined : undefined;
      setHistory((list) => list.map((h) => (h.id === id ? { ...h, favorite: next } : h)));
      void setLogoFavorite(parseInt(id, 10), next, fileId).catch(() => {
        setHistory((list) => list.map((h) => (h.id === id ? { ...h, favorite: !next } : h)));
        setError("Could not update the favorite. Please try again.");
      });
    },
    onDelete: (id) => {
      const previous = history;
      setHistory((list) => list.filter((h) => h.id !== id));
      void deleteLogoGeneration(Number(id)).catch(() => {
        setHistory(previous);
        setError("Could not delete the generation. Please try again.");
      });
    },
    onOpenAgain: (entry) =>
      patchSettings({
        prompt: entry.prompt,
        style: entry.style,
        colors: entry.color ? [entry.color] : undefined,
        ratio: entry.ratio,
      }),
  };

  /** Server-side regenerate of a history entry (used as Open Again + run). */
  async function handleRegenerate(entry: ToolHistoryItem) {
    if (generating) return;
    setGenerating(true);
    setError(null);

    try {
      applyResult(await regenerateLogo(parseInt(entry.id, 10)), "Regenerated with the original settings.");
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
