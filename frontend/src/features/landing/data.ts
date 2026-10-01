import type { LucideIcon } from "lucide-react";
import {
  Brush,
  Command,
  Flower2,
  MessagesSquare,
  Newspaper,
  PenTool,
  ScanFace,
  ScanText,
    Sparkles,
} from "lucide-react";

export const landingNav = [
  { title: "Tools", href: "#tools" },
  { title: "How it works", href: "#how-it-works" },
  { title: "Pricing", href: "#pricing" },
  { title: "FAQ", href: "#faq" },
];

export const heroPrompts = [
  "A minimal brass compass logo for a travel-gear brand",
  "Illustrated avatar — curly hair, round glasses, warm studio light",
  "Fine-line tattoo: crescent moon wrapped in wildflowers",
  "Scandinavian living room, oak and linen, morning light",
  "Launch-party flyer, rooftop at dusk, bold serif type",
];

export const trustedCompanies = [
  "Nordlicht",
  "Halcyon",
  "Kilnworks",
  "Ostrove",
  "Featherlight",
  "Tessel",
  "Marrow Studio",
  "Vantablu",
];

export interface Tool {
  id: string;
  name: string;
  tab: string;
  headline: string;
  description: string;
  prompt: string;
  model: string;
  icon: LucideIcon;
  colors: [string, string];
}

export const tools: Tool[] = [
  {
    id: "logo",
    name: "Logo Generator",
    tab: "AI Logo Generator",
    headline: "Create marks that feel designed, not generated.",
    description: "Describe the brand and cast a sheet of logo concepts — monograms, seals, and wordmarks ready for web or print.",
    prompt: "Ember & Oak coffee roasters — a warm flame-and-leaf seal",
    model: "GPT Image",
    icon: PenTool,
    colors: ["#B8823C", "#523a1b"],
  },
  {
    id: "avatar",
    name: "Avatar Generator",
    tab: "AI Avatar Generator",
    headline: "Portraits for profiles, teams, and characters.",
    description: "Turn a description or a reference photo into a consistent set of avatars in six styles, from painterly to pixel.",
    prompt: "Curly-haired product designer, round glasses, warm studio light",
    model: "FLUX",
    icon: ScanFace,
    colors: ["#4C9186", "#22413c"],
  },
  {
    id: "tattoo",
    name: "Tattoo Generator",
    tab: "AI Tattoo Generator",
    headline: "Flash sheets your artist can actually work from.",
    description: "Fine-line, old school, geometric, and blackwork concepts sized for the placement you have in mind.",
    prompt: "Crescent moon wrapped in wildflowers, single needle, delicate",
    model: "Stable Diffusion",
    icon: Brush,
    colors: ["#1B1B18", "#3A5A54"],
  },
  {
    id: "image",
    name: "Image Generator",
    tab: "AI Image Generator",
    headline: "Create eye-catching images and graphics.",
    description: "Generate high-quality images for a wide range of applications — product shots, editorial stills, and social visuals.",
    prompt: "An astronaut riding a horse on Mars, dramatic lighting",
    model: "FLUX",
    icon: Newspaper,
    colors: ["#2a4a46", "#153029"],
  },
  {
    id: "flyer",
    name: "Flyer Generator",
    tab: "AI Flyer Generator",
    headline: "Print-ready flyers from a one-line brief.",
    description: "Posters and flyers with real layout sense — headline hierarchy, balanced whitespace, and export at print resolution.",
    prompt: "Rooftop summer launch party, bold type, sunset palette",
    model: "GPT Image",
    icon: Flower2,
    colors: ["#8C6329", "#3f2c12"],
  },
  {
    id: "image-description",
    name: "Image Description",
    tab: "AI Image Description",
    headline: "Alt text and captions, written for you.",
    description: "Accurate, editable descriptions of any image — for accessibility, SEO, and searchable asset libraries.",
    prompt: "Describe hero-shot.png for alt text",
    model: "Gemini",
    icon: ScanText,
    colors: ["#4C9186", "#12232b"],
  },
];

export const steps = [
  {
    number: "01",
    title: "Describe it",
    description:
      "Type a prompt, paste a brief, or drop a moodboard. The studio reads intent, not just keywords.",
    icon: MessagesSquare,
  },
  {
    number: "02",
    title: "Shape it",
    description:
      "Branch variations, adjust light and tone with plain-language edits, and pin your brand kit.",
    icon: Command,
  },
  {
    number: "03",
    title: "Ship it",
    description:
      "Export in every format your channels need — print, social, web, broadcast — from one click.",
    icon: Sparkles,
  },
];

export const testimonials = [
  {
    quote:
      "We cut concept-to-client time from two weeks to two days. The scary part is the work got better, not worse.",
    name: "Mara Ellison",
    role: "Creative Director, Halcyon",
    initials: "ME",
  },
  {
    quote:
      "The brand kit is the feature nobody else gets right. Five hundred assets later, everything still looks like us.",
    name: "Jonas Reber",
    role: "Head of Design, Nordlicht",
    initials: "JR",
  },
  {
    quote: "I storyboard in Image Studio, animate in Video Lab, and score in Audio Room. One tab. That's the pitch.",
    name: "Priya Anand",
    role: "Freelance Director",
    initials: "PA",
  },
  {
    quote: "Our juniors ship senior-level drafts now. Reviews start at 80% done instead of zero.",
    name: "Tomás Ferreira",
    role: "Studio Lead, Kilnworks",
    initials: "TF",
  },
  {
    quote: "Version history saved a campaign. Client wanted 'the one from Tuesday' — it took four seconds to find.",
    name: "Sofia Lindqvist",
    role: "Producer, Featherlight",
    initials: "SL",
  },
  {
    quote: "We were skeptical about AI audio. Then it matched a temp track our composer took a week to brief.",
    name: "Dev Okafor",
    role: "Post Supervisor, Tessel",
    initials: "DO",
  },
];

