import type { BaseSettings, GeneratedItem } from "./types";

/* ---------- Shared studio options (design prototype) ---------- */
export const DEFAULT_SWATCHES = ["#B8823C", "#4C9186", "#8C6329", "#5B584E", "#C9A45C", "#3A5A54"];
export const ASPECT_RATIOS = ["1:1", "4:5", "16:9", "9:16"];
export const QUALITY_LEVELS = ["Draft", "Standard", "High"];

export const RATIO_CLASSES: Record<string, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16]",
};

/* ---------- Mock helpers ---------- */

/** Darken a hex color by `amount` (0–1). */
export function shade(hex: string | null | undefined, amount: number): string {
  // Null/invalid tolerant: generations without a selected color must
  // never crash the results mapper (the server sends color: null when
  // the user picked no swatches).
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) hex = "#B8823C";
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** First letter of the prompt (or "A"). */
export function monogram(prompt: string): string {
  const match = prompt.match(/[a-zA-Z]/);
  return (match?.[0] ?? "A").toUpperCase();
}

const counters: Record<string, number> = {};

/** Build a mock batch from the current settings. */
export function makeBatch(settings: BaseSettings, tagPrefix = "DRAFT"): GeneratedItem[] {
  return Array.from({ length: settings.quantity }, (_, i) => {
    counters[tagPrefix] = (counters[tagPrefix] ?? 0) + 1;
    return {
      id: crypto.randomUUID(),
      prompt: settings.prompt,
      style: settings.style,
      ratio: settings.ratio,
      colors: [settings.color, shade(settings.color, 0.55 + (i % 3) * 0.12)] as [string, string],
      tag: `${tagPrefix}_${String(counters[tagPrefix]).padStart(2, "0")}`,
      createdAt: Date.now(),
      favorite: false,
      variant: i,
    };
  });
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** "2026-07-09T14:32:00Z" → "Jul 09 · 14:32" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} \u00b7 ${time}`;
}
