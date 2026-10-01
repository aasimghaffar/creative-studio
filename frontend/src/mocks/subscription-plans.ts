export interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string;
  monthly: number | null;
  yearly: number | null;
  credits: string;
  featureList: string[];
  popular?: boolean;
  current?: boolean;
}

export const mockPlans: SubscriptionPlan[] = [
  {
    id: "sketch",
    name: "Sketch",
    tagline: "For trying ideas on for size.",
    monthly: 0,
    yearly: 0,
    credits: "120 credits / mo",
    featureList: ["Logo & Tattoo studios", "1 project, 1 seat", "Personal license"],
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "For working creatives and small teams.",
    monthly: 29,
    yearly: 24,
    credits: "2,000 credits / mo",
    featureList: ["All studios", "Up to 5 seats", "Brand kits & history", "Commercial license"],
    popular: true,
    current: true,
  },
  {
    id: "agency",
    name: "Agency",
    tagline: "For studios shipping at scale.",
    monthly: null,
    yearly: null,
    credits: "Unlimited credits",
    featureList: ["Everything in Studio", "Unlimited seats & SSO", "Dedicated capacity", "Indemnification & DPA"],
  },
];
