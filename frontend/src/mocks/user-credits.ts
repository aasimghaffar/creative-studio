import type { UserCredits } from "@/features/studio-kit";

/** Mock account credit balance shared by all studios. */
export const mockUserCredits: UserCredits = {
  balance: 1240,
  total: 2000,
  plan: "Studio",
  resetsOn: "Aug 1, 2026",
};

export const CREDITS_PER_DRAFT = 2;
