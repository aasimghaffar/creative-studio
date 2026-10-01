import { monogram, type ToolHistoryItem } from "@/features/studio-kit";

/** Build a downloadable SVG for any history entry, keyed by its toolId. */
export function generationToSvg(entry: ToolHistoryItem): string {
  const [c1, c2] = entry.thumb.colors;
  if (entry.toolId === "tattoo") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#EDEAE1"/>
  <path d="M300 128 a120 120 0 1 0 84 204 a96 96 0 1 1 -84 -204 z" fill="none" stroke="${c1}" stroke-width="10" stroke-linejoin="round"/>
  <g fill="${c1}"><circle cx="356" cy="150" r="7"/><circle cx="392" cy="196" r="5"/><circle cx="150" cy="356" r="6"/></g>
</svg>`;
  }
  if (entry.toolId === "avatar") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <circle cx="256" cy="208" r="72" fill="none" stroke="#EDEAE1" stroke-width="10"/>
  <path d="M120 432 a136 136 0 0 1 272 0" fill="none" stroke="#EDEAE1" stroke-width="10"/>
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <circle cx="256" cy="256" r="96" fill="none" stroke="#EDEAE1" stroke-width="8"/>
  <text x="256" y="292" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="110" fill="#EDEAE1">${monogram(entry.prompt)}</text>
</svg>`;
}

export function downloadGenerationSvg(entry: ToolHistoryItem) {
  const blob = new Blob([generationToSvg(entry)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${entry.toolId}-${entry.id.slice(0, 6)}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
