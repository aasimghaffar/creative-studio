export type FileType = "image" | "video" | "audio" | "document";

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  ext: string;
  sizeMb: number;
  createdAt: string;
  /** Gradient pair for mock thumbnails (images/video). */
  colors: [string, string];
  /** Real file URL (API-backed) — rendered instead of the gradient. */
  url?: string;
}

export const mockFiles: FileItem[] = [
  { id: "f1", name: "nimbus-logo-final", type: "image", ext: "svg", sizeMb: 0.2, createdAt: "2026-07-09T11:30:00", colors: ["#B8823C", "#523a1b"] },
  { id: "f2", name: "campaign-hero-4k", type: "image", ext: "png", sizeMb: 14.6, createdAt: "2026-07-09T09:12:00", colors: ["#2a4a46", "#153029"] },
  { id: "f3", name: "launch-teaser-cut2", type: "video", ext: "mp4", sizeMb: 182.4, createdAt: "2026-07-08T18:45:00", colors: ["#3a3326", "#12232b"] },
  { id: "f4", name: "brand-guidelines-v3", type: "document", ext: "pdf", sizeMb: 4.8, createdAt: "2026-07-08T14:02:00", colors: ["#5B584E", "#292723"] },
  { id: "f5", name: "ambient-score-90bpm", type: "audio", ext: "wav", sizeMb: 46.1, createdAt: "2026-07-07T16:20:00", colors: ["#4C9186", "#22413c"] },
  { id: "f6", name: "avatar-set-team", type: "image", ext: "png", sizeMb: 8.3, createdAt: "2026-07-07T10:05:00", colors: ["#4C9186", "#1a2926"] },
  { id: "f7", name: "flash-sheet-moon", type: "image", ext: "svg", sizeMb: 0.1, createdAt: "2026-07-06T19:44:00", colors: ["#EDEAE1", "#D8D2C2"] },
  { id: "f8", name: "invoice-june-2026", type: "document", ext: "pdf", sizeMb: 0.3, createdAt: "2026-07-01T08:00:00", colors: ["#5B584E", "#292723"] },
  { id: "f9", name: "voiceover-draft-01", type: "audio", ext: "mp3", sizeMb: 9.7, createdAt: "2026-06-30T13:15:00", colors: ["#8C6329", "#3f2c12"] },
  { id: "f10", name: "rooftop-flyer-print", type: "image", ext: "jpg", sizeMb: 6.2, createdAt: "2026-06-29T17:30:00", colors: ["#40372a", "#12232b"] },
];
