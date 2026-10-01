import type { LucideIcon } from "lucide-react";
import { Coins, CreditCard, Database, Gauge, Sparkles, UserPlus, Users } from "lucide-react";

/* ---------- Overview stats ---------- */
export interface AdminStat {
  id: string;
  label: string;
  value: string;
  delta: string;
  up: boolean;
  icon: LucideIcon;
}

export const adminStats: AdminStat[] = [
  { id: "users", label: "Total users", value: "41,208", delta: "+4.2% this month", up: true, icon: Users },
  { id: "active", label: "Active users (30d)", value: "18,977", delta: "+2.8%", up: true, icon: Gauge },
  { id: "generations", label: "AI generations", value: "12.4M", delta: "+11.6%", up: true, icon: Sparkles },
  { id: "revenue", label: "Revenue (MRR)", value: "$186,420", delta: "+3.1%", up: true, icon: CreditCard },
  { id: "subs", label: "Active subscriptions", value: "9,318", delta: "+188 net", up: true, icon: UserPlus },
  { id: "credits", label: "Credits used (30d)", value: "7.9M", delta: "-1.4%", up: false, icon: Coins },
  { id: "storage", label: "Storage used", value: "48.2 TB", delta: "of 80 TB", up: true, icon: Database },
  { id: "api", label: "API requests (24h)", value: "2.1M", delta: "p95 412 ms", up: true, icon: Gauge },
];

/* ---------- Series for charts ---------- */
export interface SeriesPoint { label: string; value: number; }

export const revenueSeries: SeriesPoint[] = [
  { label: "Aug", value: 121 }, { label: "Sep", value: 128 }, { label: "Oct", value: 134 },
  { label: "Nov", value: 131 }, { label: "Dec", value: 142 }, { label: "Jan", value: 149 },
  { label: "Feb", value: 155 }, { label: "Mar", value: 161 }, { label: "Apr", value: 168 },
  { label: "May", value: 172 }, { label: "Jun", value: 181 }, { label: "Jul", value: 186 },
];

export const signupsSeries: SeriesPoint[] = [
  { label: "Mon", value: 212 }, { label: "Tue", value: 258 }, { label: "Wed", value: 231 },
  { label: "Thu", value: 289 }, { label: "Fri", value: 264 }, { label: "Sat", value: 143 }, { label: "Sun", value: 128 },
];

export const aiUsageByTool: SeriesPoint[] = [
  { label: "Logo", value: 4820 }, { label: "Avatar", value: 3140 }, { label: "Tattoo", value: 2410 },
  { label: "Image", value: 1520 }, { label: "Flyer", value: 340 }, { label: "Interior", value: 190 },
];

export const creditsSeries: SeriesPoint[] = [
  { label: "W1", value: 1.6 }, { label: "W2", value: 1.9 }, { label: "W3", value: 2.2 }, { label: "W4", value: 2.2 },
];

/* ---------- Recents ---------- */
export interface RecentRow { id: string; primary: string; secondary: string; meta: string; tone?: "teal" | "brass" | "destructive"; }

export const recentRegistrations: RecentRow[] = [
  { id: "r1", primary: "Sana Malik", secondary: "sana@featherlight.co · Studio trial", meta: "2m ago", tone: "teal" },
  { id: "r2", primary: "Jonas Reber", secondary: "jonas@nordlicht.de · Sketch", meta: "18m ago" },
  { id: "r3", primary: "Priya Anand", secondary: "priya.a@gmail.com · Sketch", meta: "41m ago" },
  { id: "r4", primary: "Tomás Ferreira", secondary: "tomas@kilnworks.pt · Studio", meta: "1h ago", tone: "teal" },
  { id: "r5", primary: "Dev Okafor", secondary: "dev@tessel.io · Agency demo", meta: "3h ago", tone: "brass" },
];

export const recentAiActivity: RecentRow[] = [
  { id: "a1", primary: "Logo Generator", secondary: "4 drafts · “Ember & Oak coffee roasters”", meta: "just now" },
  { id: "a2", primary: "Avatar Generator", secondary: "6 portraits · “Cyberpunk DJ, neon rim light”", meta: "1m ago" },
  { id: "a3", primary: "Tattoo Generator", secondary: "4 designs · “Geometric wolf, dotwork”", meta: "4m ago" },
  { id: "a4", primary: "Logo Generator", secondary: "Failed · GPU pool at capacity, auto-refunded", meta: "9m ago", tone: "destructive" },
  { id: "a5", primary: "Image Generator", secondary: "2 renders · “Matte ceramic bottle, morning light”", meta: "12m ago" },
];

export const recentPayments: RecentRow[] = [
  { id: "p1", primary: "$288.00 — Studio yearly", secondary: "halcyon.agency · INV-2026-2214", meta: "6m ago", tone: "teal" },
  { id: "p2", primary: "$19.00 — Credit top-up", secondary: "priya.a@gmail.com · INV-2026-2213", meta: "22m ago", tone: "teal" },
  { id: "p3", primary: "$29.00 — Studio monthly", secondary: "marrow.studio · INV-2026-2212", meta: "1h ago", tone: "teal" },
  { id: "p4", primary: "$96.00 — Seats × 4", secondary: "vantablu.fm · payment failed, retrying", meta: "2h ago", tone: "destructive" },
];

/* ---------- System status ---------- */
export interface ServiceStatus { id: string; name: string; status: "operational" | "degraded" | "down"; uptime: string; latency: string; }

export const systemStatus: ServiceStatus[] = [
  { id: "s1", name: "Generation API", status: "operational", uptime: "99.98%", latency: "412 ms" },
  { id: "s2", name: "GPU render pool", status: "degraded", uptime: "99.71%", latency: "1.8 s" },
  { id: "s3", name: "Web app", status: "operational", uptime: "100%", latency: "89 ms" },
  { id: "s4", name: "File storage (CDN)", status: "operational", uptime: "99.99%", latency: "34 ms" },
  { id: "s5", name: "Billing (Stripe)", status: "operational", uptime: "100%", latency: "220 ms" },
];

/* ---------- Users ---------- */
export interface AdminUser {
  id: string; name: string; email: string; plan: "Sketch" | "Studio" | "Agency";
  status: "active" | "suspended" | "trial"; creditsUsed: number; generations: number;
  storageGb: number; country: string; joinedAt: string; lastActive: string;
}

export const adminUsers: AdminUser[] = [
  { id: "u1", name: "Mara Ellison", email: "mara@halcyon.agency", plan: "Agency", status: "active", creditsUsed: 18240, generations: 9120, storageGb: 212.4, country: "US", joinedAt: "2025-03-14T10:00:00", lastActive: "2026-07-10T08:12:00" },
  { id: "u2", name: "Jonas Reber", email: "jonas@nordlicht.de", plan: "Studio", status: "active", creditsUsed: 1620, generations: 810, storageGb: 24.1, country: "DE", joinedAt: "2025-11-02T09:30:00", lastActive: "2026-07-10T07:44:00" },
  { id: "u3", name: "Priya Anand", email: "priya.a@gmail.com", plan: "Sketch", status: "trial", creditsUsed: 96, generations: 48, storageGb: 1.2, country: "IN", joinedAt: "2026-07-01T15:20:00", lastActive: "2026-07-09T22:05:00" },
  { id: "u4", name: "Tomás Ferreira", email: "tomas@kilnworks.pt", plan: "Studio", status: "active", creditsUsed: 3480, generations: 1740, storageGb: 41.8, country: "PT", joinedAt: "2025-06-19T12:00:00", lastActive: "2026-07-10T09:01:00" },
  { id: "u5", name: "Sofia Lindqvist", email: "sofia@featherlight.se", plan: "Studio", status: "active", creditsUsed: 2210, generations: 1105, storageGb: 18.9, country: "SE", joinedAt: "2025-09-08T08:15:00", lastActive: "2026-07-08T17:30:00" },
  { id: "u6", name: "Dev Okafor", email: "dev@tessel.io", plan: "Agency", status: "active", creditsUsed: 25110, generations: 12555, storageGb: 388.0, country: "NG", joinedAt: "2024-12-01T11:45:00", lastActive: "2026-07-10T06:58:00" },
  { id: "u7", name: "Lena Hoffmann", email: "lena.h@outlook.com", plan: "Sketch", status: "suspended", creditsUsed: 118, generations: 59, storageGb: 0.8, country: "DE", joinedAt: "2026-02-11T14:00:00", lastActive: "2026-05-30T10:10:00" },
  { id: "u8", name: "Ayesha Khan", email: "ayesha@marrow.studio", plan: "Studio", status: "active", creditsUsed: 4090, generations: 2045, storageGb: 55.6, country: "PK", joinedAt: "2025-04-27T16:40:00", lastActive: "2026-07-09T19:22:00" },
];

/* ---------- AI management ---------- */
export interface AdminTool { id: string; name: string; category: string; status: "live" | "beta" | "disabled"; runs30d: number; avgCredits: number; }

export const adminTools: AdminTool[] = [
  { id: "t1", name: "Logo Generator", category: "Branding", status: "live", runs30d: 482000, avgCredits: 8 },
  { id: "t2", name: "Avatar Generator", category: "Portrait", status: "live", runs30d: 314000, avgCredits: 8 },
  { id: "t3", name: "Tattoo Generator", category: "Illustration", status: "live", runs30d: 241000, avgCredits: 8 },
  { id: "t4", name: "Image Generator", category: "Rendering", status: "beta", runs30d: 152000, avgCredits: 6 },
  { id: "t5", name: "Flyer Generator", category: "Print", status: "beta", runs30d: 34000, avgCredits: 10 },
  { id: "t6", name: "Interior Designer", category: "Rendering", status: "beta", runs30d: 19000, avgCredits: 12 },
  { id: "t7", name: "Face Detection", category: "Vision", status: "disabled", runs30d: 0, avgCredits: 2 },
  { id: "t8", name: "Image Description", category: "Vision", status: "disabled", runs30d: 0, avgCredits: 1 },
];

export interface ToolCategory { id: string; name: string; tools: number; description: string; }
export const toolCategories: ToolCategory[] = [
  { id: "c1", name: "Branding", tools: 1, description: "Marks, wordmarks, and identity systems." },
  { id: "c2", name: "Portrait", tools: 1, description: "Avatars and character portraits." },
  { id: "c3", name: "Illustration", tools: 1, description: "Flash sheets and drawn artwork." },
  { id: "c4", name: "Rendering", tools: 2, description: "Photoreal images and spaces." },
  { id: "c5", name: "Print", tools: 1, description: "Flyers, posters, and layouts." },
  { id: "c6", name: "Vision", tools: 2, description: "Detection and captioning utilities." },
];

export interface AdminTemplate { id: string; toolId: string; label: string; prompt: string; status: "published" | "draft"; uses30d: number; }
export const adminTemplates: AdminTemplate[] = [
  { id: "at1", toolId: "logo", label: "Coffee roastery", prompt: "Ember & Oak coffee roasters — a warm flame-and-leaf seal, artisanal", status: "published", uses30d: 4210 },
  { id: "at2", toolId: "logo", label: "Tech startup", prompt: "Lattice — a modular grid mark for a developer-tools startup, precise", status: "published", uses30d: 3894 },
  { id: "at3", toolId: "avatar", label: "Team headshot", prompt: "Friendly engineer, short beard, navy sweater, soft office light", status: "published", uses30d: 2977 },
  { id: "at4", toolId: "tattoo", label: "Botanical", prompt: "Sprig of lavender with a tiny bee, single needle, delicate", status: "published", uses30d: 2145 },
  { id: "at5", toolId: "avatar", label: "Retro pixel", prompt: "16-bit hero portrait, chunky pixels, warm palette", status: "draft", uses30d: 0 },
];

/* ---------- Billing ---------- */
export interface AdminCoupon { id: string; code: string; discount: string; redemptions: number; limit: number; expiresAt: string; active: boolean; }
export const adminCoupons: AdminCoupon[] = [
  { id: "cp1", code: "LAUNCH25", discount: "25% off first year", redemptions: 1240, limit: 5000, expiresAt: "2026-09-01", active: true },
  { id: "cp2", code: "CODEBAR", discount: "3 months free Studio", redemptions: 86, limit: 200, expiresAt: "2026-12-31", active: true },
  { id: "cp3", code: "BLACKFRIDAY", discount: "40% off yearly", redemptions: 3811, limit: 4000, expiresAt: "2025-12-01", active: false },
];

export interface AdminPayment { id: string; date: string; customer: string; description: string; amount: number; status: "paid" | "pending" | "failed" | "refunded"; invoiceNo: string; }
export const adminPayments: AdminPayment[] = [
  { id: "ap1", date: "2026-07-10T08:06:00", customer: "halcyon.agency", description: "Studio yearly renewal", amount: 288.0, status: "paid", invoiceNo: "INV-2026-2214" },
  { id: "ap2", date: "2026-07-10T07:50:00", customer: "priya.a@gmail.com", description: "Credit top-up — 500", amount: 19.0, status: "paid", invoiceNo: "INV-2026-2213" },
  { id: "ap3", date: "2026-07-10T07:02:00", customer: "marrow.studio", description: "Studio monthly", amount: 29.0, status: "paid", invoiceNo: "INV-2026-2212" },
  { id: "ap4", date: "2026-07-10T06:14:00", customer: "vantablu.fm", description: "Seats × 4", amount: 96.0, status: "failed", invoiceNo: "INV-2026-2211" },
  { id: "ap5", date: "2026-07-09T21:33:00", customer: "ostrove.co", description: "Agency invoice — July", amount: 1450.0, status: "pending", invoiceNo: "INV-2026-2209" },
  { id: "ap6", date: "2026-07-09T18:20:00", customer: "lena.h@outlook.com", description: "Credit top-up — refund", amount: 19.0, status: "refunded", invoiceNo: "INV-2026-2201" },
];

/* ---------- Content ---------- */
export interface Announcement { id: string; title: string; audience: string; publishedAt: string; status: "published" | "scheduled" | "draft"; }
export const adminAnnouncements: Announcement[] = [
  { id: "an1", title: "Tattoo Generator is live for all plans", audience: "All users", publishedAt: "2026-06-28T09:00:00", status: "published" },
  { id: "an2", title: "Scheduled maintenance — July 14, 02:00 UTC", audience: "All users", publishedAt: "2026-07-12T09:00:00", status: "scheduled" },
  { id: "an3", title: "Agency plan: custom model fine-tuning", audience: "Agency", publishedAt: "", status: "draft" },
];

export interface HelpArticle { id: string; title: string; category: string; views30d: number; updatedAt: string; status: "published" | "draft"; }
export const adminHelpArticles: HelpArticle[] = [
  { id: "ha1", title: "Your first render in five minutes", category: "Getting started", views30d: 18240, updatedAt: "2026-06-02T10:00:00", status: "published" },
  { id: "ha2", title: "How credits are counted", category: "Billing", views30d: 12110, updatedAt: "2026-05-21T14:30:00", status: "published" },
  { id: "ha3", title: "Brand kits explained", category: "Studios", views30d: 8450, updatedAt: "2026-06-18T09:15:00", status: "published" },
  { id: "ha4", title: "Fine-tuning on Agency (draft)", category: "Studios", views30d: 0, updatedAt: "2026-07-05T16:00:00", status: "draft" },
];

/* ---------- System ---------- */
export interface ApiKeyRow { id: string; name: string; prefix: string; createdAt: string; lastUsed: string; requests24h: number; active: boolean; }
export const adminApiKeys: ApiKeyRow[] = [
  { id: "k1", name: "Production — web app", prefix: "acs_live_9f2…", createdAt: "2025-08-01T00:00:00", lastUsed: "2026-07-10T09:58:00", requests24h: 1840000, active: true },
  { id: "k2", name: "Zapier integration", prefix: "acs_live_4b7…", createdAt: "2026-01-15T00:00:00", lastUsed: "2026-07-10T09:12:00", requests24h: 212000, active: true },
  { id: "k3", name: "Staging", prefix: "acs_test_1a0…", createdAt: "2025-08-01T00:00:00", lastUsed: "2026-07-08T11:40:00", requests24h: 48000, active: true },
  { id: "k4", name: "Legacy mobile beta", prefix: "acs_live_77c…", createdAt: "2024-11-20T00:00:00", lastUsed: "2026-03-02T08:00:00", requests24h: 0, active: false },
];

/* ---------- Support ---------- */
export interface SupportTicket { id: string; subject: string; requester: string; priority: "low" | "normal" | "high"; status: "open" | "pending" | "resolved"; updatedAt: string; }
export const adminTickets: SupportTicket[] = [
  { id: "tk1", subject: "Yearly invoice shows wrong VAT number", requester: "jonas@nordlicht.de", priority: "high", status: "open", updatedAt: "2026-07-10T08:40:00" },
  { id: "tk2", subject: "Can't download 16:9 logo drafts", requester: "sofia@featherlight.se", priority: "normal", status: "pending", updatedAt: "2026-07-10T07:15:00" },
  { id: "tk3", subject: "Request: SSO for 20-seat team", requester: "dev@tessel.io", priority: "normal", status: "open", updatedAt: "2026-07-09T19:02:00" },
  { id: "tk4", subject: "Credits not refunded after failed batch", requester: "priya.a@gmail.com", priority: "high", status: "resolved", updatedAt: "2026-07-09T12:30:00" },
];

export interface ContactMessage { id: string; name: string; email: string; topic: string; excerpt: string; receivedAt: string; read: boolean; }
export const adminContactMessages: ContactMessage[] = [
  { id: "cm1", name: "Omar Siddiqui", email: "omar@studio.co", topic: "Partnership", excerpt: "We run a 40-person agency and would love to talk volume pricing…", receivedAt: "2026-07-10T06:22:00", read: false },
  { id: "cm2", name: "Grace Liu", email: "grace@paperplane.io", topic: "Press", excerpt: "Writing a piece on AI design tools — could we get a quote from…", receivedAt: "2026-07-09T15:48:00", read: false },
  { id: "cm3", name: "Marco Bellini", email: "marco.b@gmail.com", topic: "General", excerpt: "Is there a student discount for the Studio plan?", receivedAt: "2026-07-08T10:05:00", read: true },
];

export interface BugReport { id: string; title: string; reporter: string; area: string; severity: "minor" | "major" | "critical"; status: "new" | "triaged" | "fixed"; reportedAt: string; }
export const adminBugReports: BugReport[] = [
  { id: "bg1", title: "History date filter off by one on DST boundary", reporter: "tomas@kilnworks.pt", area: "Global History", severity: "minor", status: "triaged", reportedAt: "2026-07-09T09:10:00" },
  { id: "bg2", title: "Avatar upload preview rotated on iOS", reporter: "ayesha@marrow.studio", area: "Avatar Generator", severity: "major", status: "new", reportedAt: "2026-07-10T05:44:00" },
  { id: "bg3", title: "Invoice download 500 on refunded payments", reporter: "internal QA", area: "Billing", severity: "critical", status: "fixed", reportedAt: "2026-07-06T13:20:00" },
];

/* ---------- Admin notifications (header bell) ---------- */
export const adminHeaderNotifications: { id: string; title: string; description: string; time: string; read: boolean; icon: LucideIcon }[] = [
  { id: "an1", title: "GPU pool degraded", description: "Render latency at 1.8 s — autoscaling in progress.", time: "9m ago", read: false, icon: Gauge },
  { id: "an2", title: "Payment failed", description: "vantablu.fm — Seats × 4 ($96.00), retry scheduled.", time: "2h ago", read: false, icon: CreditCard },
  { id: "an3", title: "New Agency signup", description: "dev@tessel.io upgraded to Agency (12 seats).", time: "6h ago", read: true, icon: UserPlus },
];

/* ============ Admin settings & configuration (spec-driven) ============ */

/* ---------- Per-tool configuration ---------- */
export const AI_MODELS = ["GPT Image", "FLUX", "Gemini", "Stable Diffusion"];

export interface ToolConfig {
  id: string;
  name: string;
  enabled: boolean;
  creditsPerGeneration: number;
  promptLimit: number;
  uploadSupport: boolean;
  maxUploadMb: number;
  allowedTypes: string[];
  model: string;
  timeoutSec: number;
}

export const toolConfigs: ToolConfig[] = [
  { id: "logo", name: "Logo Generator", enabled: true, creditsPerGeneration: 5, promptLimit: 500, uploadSupport: false, maxUploadMb: 10, allowedTypes: ["JPG", "PNG", "WEBP"], model: "GPT Image", timeoutSec: 60 },
  { id: "avatar", name: "Avatar Generator", enabled: true, creditsPerGeneration: 8, promptLimit: 500, uploadSupport: true, maxUploadMb: 20, allowedTypes: ["JPG", "PNG", "WEBP"], model: "FLUX", timeoutSec: 90 },
  { id: "tattoo", name: "Tattoo Generator", enabled: true, creditsPerGeneration: 8, promptLimit: 400, uploadSupport: false, maxUploadMb: 10, allowedTypes: ["JPG", "PNG"], model: "Stable Diffusion", timeoutSec: 90 },
  { id: "image", name: "Image Generator", enabled: true, creditsPerGeneration: 10, promptLimit: 1000, uploadSupport: true, maxUploadMb: 20, allowedTypes: ["JPG", "PNG", "WEBP"], model: "FLUX", timeoutSec: 120 },
  { id: "flyer", name: "Flyer Generator", enabled: false, creditsPerGeneration: 15, promptLimit: 800, uploadSupport: true, maxUploadMb: 50, allowedTypes: ["JPG", "PNG", "PDF"], model: "GPT Image", timeoutSec: 150 },
  { id: "interior", name: "Interior Designer", enabled: false, creditsPerGeneration: 12, promptLimit: 600, uploadSupport: true, maxUploadMb: 20, allowedTypes: ["JPG", "PNG", "WEBP"], model: "Stable Diffusion", timeoutSec: 120 },
  { id: "face-detection", name: "Face Detection", enabled: false, creditsPerGeneration: 2, promptLimit: 0, uploadSupport: true, maxUploadMb: 10, allowedTypes: ["JPG", "PNG"], model: "Gemini", timeoutSec: 30 },
  { id: "image-description", name: "Image Description", enabled: false, creditsPerGeneration: 1, promptLimit: 0, uploadSupport: true, maxUploadMb: 10, allowedTypes: ["JPG", "PNG", "WEBP"], model: "Gemini", timeoutSec: 30 },
];

/* ---------- AI provider settings ---------- */
export interface ProviderField { key: string; label: string; value: string; secret?: boolean; options?: string[]; }
export interface AiProvider { id: string; name: string; connected: boolean; fields: ProviderField[]; }

export const aiProviders: AiProvider[] = [
  { id: "openai", name: "OpenAI", connected: true, fields: [
    { key: "apiKey", label: "API Key", value: "sk-••••••••••••3kfa", secret: true },
    { key: "model", label: "Default Model", value: "gpt-4.1", options: ["gpt-4.1", "gpt-4o", "o3"] },
    { key: "imageModel", label: "Image Model", value: "gpt-image-1", options: ["gpt-image-1", "dall-e-3"] },
  ]},
  { id: "gemini", name: "Gemini", connected: true, fields: [
    { key: "apiKey", label: "API Key", value: "AIza••••••••••9uQ", secret: true },
    { key: "model", label: "Default Model", value: "gemini-2.5-pro", options: ["gemini-2.5-pro", "gemini-2.5-flash"] },
  ]},
  { id: "claude", name: "Claude", connected: false, fields: [
    { key: "apiKey", label: "API Key", value: "", secret: true },
    { key: "model", label: "Default Model", value: "claude-sonnet-4-5", options: ["claude-sonnet-4-5", "claude-opus-4-5"] },
  ]},
  { id: "flux", name: "FLUX", connected: true, fields: [
    { key: "apiKey", label: "API Key", value: "bfl-••••••••••71c", secret: true },
    { key: "imageModel", label: "Image Model", value: "flux-pro-1.1", options: ["flux-pro-1.1", "flux-dev"] },
  ]},
  { id: "elevenlabs", name: "ElevenLabs", connected: false, fields: [
    { key: "apiKey", label: "API Key", value: "", secret: true },
    { key: "voiceModel", label: "Voice Model", value: "eleven_multilingual_v2", options: ["eleven_multilingual_v2", "eleven_turbo_v2_5"] },
  ]},
];

/* ---------- Credits management ---------- */
export interface CreditsConfig {
  defaultFreeCredits: number;
  dailyLimit: number;
  monthlyReset: boolean;
  expiryDays: number;
}
export const creditsConfig: CreditsConfig = { defaultFreeCredits: 20, dailyLimit: 200, monthlyReset: true, expiryDays: 30 };

/* ---------- File manager ---------- */
export interface AdminFile {
  id: string; name: string; ext: string; type: "image" | "document";
  sizeMb: number; resolution: string; uploadedBy: string; tool: string;
  uploadedAt: string; modifiedAt: string; downloads: number; generationId: string;
  colors: [string, string];
}
export const adminFiles: AdminFile[] = [
  { id: "af1", name: "nimbus-logo-final", ext: "svg", type: "image", sizeMb: 0.2, resolution: "512×512", uploadedBy: "mara@halcyon.agency", tool: "Logo Generator", uploadedAt: "2026-07-09T11:30:00", modifiedAt: "2026-07-09T11:30:00", downloads: 14, generationId: "gen_8f2a41", colors: ["#B8823C", "#523a1b"] },
  { id: "af2", name: "team-avatar-set", ext: "png", type: "image", sizeMb: 8.3, resolution: "1024×1024", uploadedBy: "jonas@nordlicht.de", tool: "Avatar Generator", uploadedAt: "2026-07-09T09:12:00", modifiedAt: "2026-07-09T10:01:00", downloads: 6, generationId: "gen_2b7c99", colors: ["#4C9186", "#22413c"] },
  { id: "af3", name: "flash-sheet-moon", ext: "png", type: "image", sizeMb: 2.1, resolution: "1024×1024", uploadedBy: "ayesha@marrow.studio", tool: "Tattoo Generator", uploadedAt: "2026-07-08T18:45:00", modifiedAt: "2026-07-08T18:45:00", downloads: 3, generationId: "gen_c31d02", colors: ["#1B1B18", "#3A5A54"] },
  { id: "af4", name: "summer-launch-flyer", ext: "pdf", type: "document", sizeMb: 4.8, resolution: "A4", uploadedBy: "dev@tessel.io", tool: "Flyer Generator", uploadedAt: "2026-07-08T14:02:00", modifiedAt: "2026-07-08T16:20:00", downloads: 22, generationId: "gen_77c1f0", colors: ["#5B584E", "#292723"] },
  { id: "af5", name: "loft-render-04", ext: "webp", type: "image", sizeMb: 6.2, resolution: "2048×1152", uploadedBy: "sofia@featherlight.se", tool: "Interior Designer", uploadedAt: "2026-07-07T16:20:00", modifiedAt: "2026-07-07T16:20:00", downloads: 1, generationId: "gen_a90e12", colors: ["#8C6329", "#3f2c12"] },
  { id: "af6", name: "product-hero-4k", ext: "png", type: "image", sizeMb: 14.6, resolution: "3840×2160", uploadedBy: "mara@halcyon.agency", tool: "Image Generator", uploadedAt: "2026-07-07T10:05:00", modifiedAt: "2026-07-07T10:05:00", downloads: 9, generationId: "gen_5512bd", colors: ["#2a4a46", "#153029"] },
  { id: "af7", name: "reference-portrait", ext: "jpg", type: "image", sizeMb: 3.4, resolution: "1600×1600", uploadedBy: "priya.a@gmail.com", tool: "Avatar Generator", uploadedAt: "2026-07-06T19:44:00", modifiedAt: "2026-07-06T19:44:00", downloads: 0, generationId: "upload", colors: ["#4C9186", "#1a2926"] },
  { id: "af8", name: "kilnworks-seal", ext: "svg", type: "image", sizeMb: 0.1, resolution: "512×512", uploadedBy: "tomas@kilnworks.pt", tool: "Logo Generator", uploadedAt: "2026-07-05T08:30:00", modifiedAt: "2026-07-05T08:30:00", downloads: 11, generationId: "gen_dd03a7", colors: ["#8C6329", "#12232b"] },
];

export const platformStorage = { totalGb: 500, usedGb: 185 };
export const storageByTool = [
  { label: "Image Generator", sizeGb: 62.0 },
  { label: "Avatar Generator", sizeGb: 41.5 },
  { label: "Logo Generator", sizeGb: 33.2 },
  { label: "Flyer Generator", sizeGb: 24.8 },
  { label: "Tattoo Generator", sizeGb: 14.9 },
  { label: "Interior Designer", sizeGb: 8.6 },
];
export const storageByUser = [
  { label: "dev@tessel.io", sizeGb: 38.8 },
  { label: "mara@halcyon.agency", sizeGb: 21.2 },
  { label: "ayesha@marrow.studio", sizeGb: 5.6 },
  { label: "tomas@kilnworks.pt", sizeGb: 4.2 },
  { label: "sofia@featherlight.se", sizeGb: 1.9 },
];

/* ---------- Email settings ---------- */
export const smtpConfig = { host: "smtp.postmarkapp.com", port: "587", username: "apikey", encryption: "TLS" };
export interface EmailTemplate { id: string; name: string; subject: string; updatedAt: string; enabled: boolean; }
export const emailTemplates: EmailTemplate[] = [
  { id: "et1", name: "Email verification", subject: "Verify your AI Creative Studio account", updatedAt: "2026-05-10T09:00:00", enabled: true },
  { id: "et2", name: "Password reset", subject: "Reset your password", updatedAt: "2026-05-10T09:00:00", enabled: true },
  { id: "et3", name: "Welcome", subject: "Welcome to the studio — your first 20 credits", updatedAt: "2026-06-01T12:00:00", enabled: true },
  { id: "et4", name: "Subscription receipt", subject: "Your receipt from AI Creative Studio", updatedAt: "2026-06-14T10:30:00", enabled: true },
  { id: "et5", name: "Low credits warning", subject: "You're running low on credits", updatedAt: "2026-06-20T15:00:00", enabled: false },
  { id: "et6", name: "Generation failed", subject: "A generation failed — credits refunded", updatedAt: "2026-06-22T11:00:00", enabled: true },
];

/* ---------- Payment settings ---------- */
export interface PaymentGateway { id: string; name: string; enabled: boolean; fields: ProviderField[]; }
export const paymentGateways: PaymentGateway[] = [
  { id: "stripe", name: "Stripe", enabled: true, fields: [
    { key: "pk", label: "Publishable Key", value: "pk_live_••••••••7Hq2" },
    { key: "sk", label: "Secret Key", value: "sk_live_••••••••••••", secret: true },
    { key: "wh", label: "Webhook Secret", value: "whsec_••••••••••••", secret: true },
  ]},
  { id: "paypal", name: "PayPal", enabled: true, fields: [
    { key: "client", label: "Client ID", value: "AeF••••••••••••nQ8" },
    { key: "secret", label: "Client Secret", value: "••••••••••••", secret: true },
  ]},
];
export const CURRENCIES = ["USD — $", "EUR — €", "GBP — £", "PKR — ₨", "AED — د.إ"];
export const invoiceSettings = { prefix: "INV-2026-", autoGenerate: true, footerNote: "Thank you for creating with AI Creative Studio." };

/* ---------- Storage provider ---------- */
export interface StorageProviderOption { id: string; name: string; description: string; fields: ProviderField[]; }
export const storageProviderOptions: StorageProviderOption[] = [
  { id: "local", name: "Local Server", description: "Files are stored directly on your hosting server.", fields: [
    { key: "path", label: "Storage Path", value: "/var/www/storage" },
  ]},
  { id: "s3", name: "Amazon S3 (AWS)", description: "Cloud storage provided by Amazon Web Services.", fields: [
    { key: "accessKey", label: "Access Key ID", value: "AKIA••••••••WXYZ" },
    { key: "secretKey", label: "Secret Access Key", value: "••••••••••••", secret: true },
    { key: "bucket", label: "Bucket", value: "acs-production-media" },
    { key: "region", label: "Region", value: "eu-west-2" },
  ]},
  { id: "gcs", name: "Google Cloud Storage", description: "Scalable cloud storage from Google.", fields: [
    { key: "project", label: "Project ID", value: "" },
    { key: "bucket", label: "Bucket", value: "" },
    { key: "keyJson", label: "Service Account Key (JSON)", value: "", secret: true },
  ]},
];
export const activeStorageProvider = "s3";

/* ---------- Security ---------- */
export interface SecurityLog { id: string; event: string; actor: string; ip: string; at: string; tone?: "teal" | "brass" | "destructive"; }
export const securityLogs: SecurityLog[] = [
  { id: "sl1", event: "Admin setting update — payment configuration", actor: "aasim@cubixsol.com", ip: "154.80.12.9", at: "2026-07-10T09:41:00", tone: "brass" },
  { id: "sl2", event: "User login", actor: "mara@halcyon.agency", ip: "72.14.3.201", at: "2026-07-10T08:12:00", tone: "teal" },
  { id: "sl3", event: "Failed login (3rd attempt)", actor: "lena.h@outlook.com", ip: "91.44.87.30", at: "2026-07-10T07:58:00", tone: "destructive" },
  { id: "sl4", event: "Password change", actor: "tomas@kilnworks.pt", ip: "85.243.11.6", at: "2026-07-09T21:15:00", tone: "teal" },
  { id: "sl5", event: "Admin setting update — SMTP credentials", actor: "aasim@cubixsol.com", ip: "154.80.12.9", at: "2026-07-09T17:02:00", tone: "brass" },
];

/* ---------- Notification settings ---------- */
export interface NotificationEvent { id: string; label: string; admin: boolean; user: boolean; }
export const notificationEvents: NotificationEvent[] = [
  { id: "ne1", label: "New user registration", admin: true, user: true },
  { id: "ne2", label: "Payment received / failed", admin: true, user: true },
  { id: "ne3", label: "AI generation completed", admin: false, user: true },
  { id: "ne4", label: "Credits low / updated", admin: false, user: true },
  { id: "ne5", label: "Subscription started / renewed / cancelled", admin: true, user: true },
];

/* ---------- General settings ---------- */
export const generalConfig = {
  siteName: "AI Creative Studio",
  contactEmail: "hello@aicreativestudio.app",
  defaultLanguage: "English",
  timeZone: "Europe/London",
  currency: "USD — $",
  maintenanceMode: false,
};
