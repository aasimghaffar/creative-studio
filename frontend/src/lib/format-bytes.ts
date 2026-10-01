/**
 * The ONE storage formatter for every surface (dashboard, My Files,
 * admin File Manager, settings, storage cards):
 *   < 1 MB   -> KB
 *   < 1 GB   -> MB
 *   >= 1 GB  -> GB
 * Presentation only — progress bars keep calculating from raw bytes.
 */
const KB = 1024;
const MB = 1024 ** 2;
const GB = 1024 ** 3;

export function formatBytes(bytes: number): string {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  if (safe < MB) {
    const kb = safe / KB;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  if (safe < GB) {
    return `${(safe / MB).toFixed(1)} MB`;
  }
  return `${(safe / GB).toFixed(1)} GB`;
}

/** Convenience wrappers for values already held as MB / GB floats. */
export const formatMb = (mb: number): string => formatBytes(mb * MB);
export const formatGb = (gb: number): string => formatBytes(gb * GB);
