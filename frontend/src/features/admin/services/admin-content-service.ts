import { apiRequest } from "@/lib/api-client";

/** Admin → Content API: announcements, help articles, FAQs. */

export interface ApiAnnouncement {
  id: number;
  title: string;
  body: string;
  audience: "all" | "sketch" | "studio" | "agency";
  status: "draft" | "scheduled" | "published";
  publish_at: string | null;
  published_at: string | null;
  created_at: string;
  notified?: number;
}

export interface AnnouncementDraft {
  title: string;
  body: string;
  audience: ApiAnnouncement["audience"];
  status: "draft" | "scheduled" | "published";
  publish_at: string;
}

export function toAnnouncementDraft(a: ApiAnnouncement | null): AnnouncementDraft {
  return {
    title: a?.title ?? "",
    body: a?.body ?? "",
    audience: a?.audience ?? "all",
    status: a?.status === "published" ? "published" : a?.status ?? "draft",
    publish_at: a?.publish_at?.slice(0, 16).replace(" ", "T") ?? "",
  };
}

function announcementPayload(d: AnnouncementDraft): Record<string, unknown> {
  return {
    title: d.title,
    body: d.body,
    audience: d.audience,
    status: d.status,
    publish_at: d.publish_at.replace("T", " "),
  };
}

export function fetchAnnouncements(): Promise<ApiAnnouncement[]> {
  return apiRequest<{ announcements: ApiAnnouncement[] }>("/v1/admin/announcements").then((d) => d.announcements);
}
export function createAnnouncement(d: AnnouncementDraft): Promise<ApiAnnouncement> {
  return apiRequest<ApiAnnouncement>("/v1/admin/announcements", { method: "POST", body: JSON.stringify(announcementPayload(d)) });
}
export function updateAnnouncement(id: number, d: AnnouncementDraft): Promise<ApiAnnouncement> {
  return apiRequest<ApiAnnouncement>(`/v1/admin/announcements/${id}`, { method: "PUT", body: JSON.stringify(announcementPayload(d)) });
}
export function publishAnnouncement(id: number): Promise<ApiAnnouncement> {
  return apiRequest<ApiAnnouncement>(`/v1/admin/announcements/${id}/publish`, { method: "POST", body: JSON.stringify({}) });
}
export function deleteAnnouncement(id: number): Promise<unknown> {
  return apiRequest(`/v1/admin/announcements/${id}`, { method: "DELETE" });
}

/* ---------------- Help articles ---------------- */

export interface ApiHelpArticle {
  id: number;
  title: string;
  slug: string;
  category: string;
  body: string;
  status: "draft" | "published";
  views: number;
  updated_at: string;
}

export interface ArticleDraft {
  title: string;
  category: string;
  body: string;
  status: "draft" | "published";
}

export function toArticleDraft(a: ApiHelpArticle | null): ArticleDraft {
  return {
    title: a?.title ?? "",
    category: a?.category ?? "Getting started",
    body: a?.body ?? "",
    status: a?.status ?? "draft",
  };
}

export function fetchHelpArticles(): Promise<ApiHelpArticle[]> {
  return apiRequest<{ articles: ApiHelpArticle[] }>("/v1/admin/help-articles").then((d) => d.articles);
}
export function createHelpArticle(d: ArticleDraft): Promise<ApiHelpArticle> {
  return apiRequest<ApiHelpArticle>("/v1/admin/help-articles", { method: "POST", body: JSON.stringify(d) });
}
export function updateHelpArticle(id: number, d: ArticleDraft): Promise<ApiHelpArticle> {
  return apiRequest<ApiHelpArticle>(`/v1/admin/help-articles/${id}`, { method: "PUT", body: JSON.stringify(d) });
}
export function deleteHelpArticle(id: number): Promise<unknown> {
  return apiRequest(`/v1/admin/help-articles/${id}`, { method: "DELETE" });
}

/* ---------------- FAQs ---------------- */

export interface ApiFaq {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export interface FaqDraft {
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export function toFaqDraft(f: ApiFaq | null): FaqDraft {
  return {
    question: f?.question ?? "",
    answer: f?.answer ?? "",
    sort_order: f?.sort_order ?? 0,
    is_active: f?.is_active ?? true,
  };
}

export function fetchAdminFaqs(): Promise<ApiFaq[]> {
  return apiRequest<{ faqs: ApiFaq[] }>("/v1/admin/faqs").then((d) => d.faqs);
}
export function createFaq(d: FaqDraft): Promise<ApiFaq> {
  return apiRequest<ApiFaq>("/v1/admin/faqs", { method: "POST", body: JSON.stringify(d) });
}
export function updateFaq(id: number, d: FaqDraft): Promise<ApiFaq> {
  return apiRequest<ApiFaq>(`/v1/admin/faqs/${id}`, { method: "PUT", body: JSON.stringify(d) });
}
export function deleteFaq(id: number): Promise<unknown> {
  return apiRequest(`/v1/admin/faqs/${id}`, { method: "DELETE" });
}
