import type { LucideIcon } from "lucide-react";
import { BookOpen, Bug, Lightbulb, LifeBuoy } from "lucide-react";

export interface HelpLink {
  title: string;
  description: string;
  icon: LucideIcon;
  guide: string[];
}

export const helpCenterLinks: HelpLink[] = [
  {
    title: "Getting started",
    description: "Your first render in five minutes — prompts, styles, and credits explained.",
    icon: BookOpen,
    guide: [
      "Pick a tool from the sidebar — Logo, Avatar, Tattoo, Image, Flyer, or Image Description.",
      "Describe what you want in plain language, then choose a style, colours, and aspect ratio.",
      "Each draft costs the credits shown next to the Generate button; your balance is in the header.",
      "Generated drafts land on the canvas instantly and are saved to your History and My Files automatically.",
      "Use the download icon on any draft to save it, or the heart to keep it in Favorites.",
    ],
  },
  {
    title: "Studios guide",
    description: "Deep dives on every tool, from logo marks to flash sheets.",
    icon: LifeBuoy,
    guide: [
      "Logo Generator — describe the brand, pick up to three colours, and generate mark concepts; regenerate any history entry with its original settings.",
      "Avatar Generator — describe the person, choose style, expression, and framing for profile-ready portraits.",
      "Tattoo Generator — idea to flash sheet; styles range from fine-line to traditional.",
      "Image Generator — free-form text to image for any scene or concept.",
      "Flyer Generator — event or offer details become poster-style layouts with clear hierarchy.",
      "Image Description — upload an image and get clear descriptive text for alt text, catalogs, or prompts.",
      "Every run is stored in Global History; use the search bar (Ctrl+K) to find past prompts.",
    ],
  },
  {
    title: "Billing & credits",
    description: "Plans, invoices, top-ups, and how usage is counted.",
    icon: BookOpen,
    guide: [
      "Credits reset every billing cycle; each generation shows its cost before you run it.",
      "Failed generations are refunded automatically — you only pay for delivered results.",
      "Upgrade or switch plans from Billing & Plans; yearly billing charges the yearly total shown at checkout.",
      "Every payment produces an invoice — download it from the Billing page.",
      "Questions about a charge? Send us a message below and include the invoice number.",
    ],
  },
];

export const supportTopics = ["General question", "Report a bug", "Feature request", "Billing issue"];

export const TOPIC_ICONS: Record<string, LucideIcon> = {
  "Report a bug": Bug,
  "Feature request": Lightbulb,
};

