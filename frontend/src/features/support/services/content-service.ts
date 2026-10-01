import { apiRequest } from "@/lib/api-client";

/** Public content — the same faqs table the admin Content module manages. */

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

export function fetchPublicFaqs(): Promise<FaqItem[]> {
  return apiRequest<{ faqs: FaqItem[] }>("/v1/faqs").then((d) => d.faqs);
}
