import { env } from "@/lib/env";

/** Single source of truth for app-wide branding & links. */
export const siteConfig = {
  name: env.VITE_APP_NAME,
  description: "A production-ready SaaS application.",
  url: "https://example.com",
  links: {
    twitter: "https://twitter.com/yourhandle",
    github: "https://github.com/yourorg/yourrepo",
  },
} as const;

export type SiteConfig = typeof siteConfig;
