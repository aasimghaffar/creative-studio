import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { siteConfig } from "@/config/site";

/**
 * Platform config from GET /v1/platform — THE source for branding
 * (site name in the navbar, footer, sidebar, page titles) and the
 * maintenance flag. Fetched once per session with a module cache;
 * admins call invalidatePlatformConfig() after saving General Settings.
 */
export interface PlatformConfig {
  site_name: string;
  contact_email: string;
  currency: string;
  maintenance_mode: boolean;
}

const FALLBACK: PlatformConfig = {
  site_name: siteConfig.name,
  contact_email: "",
  currency: "USD",
  maintenance_mode: false,
};

let cache: PlatformConfig | null = null;
let inflight: Promise<PlatformConfig> | null = null;
const listeners = new Set<(config: PlatformConfig) => void>();

function load(): Promise<PlatformConfig> {
  if (cache) return Promise.resolve(cache);
  inflight ??= apiRequest<PlatformConfig>("/v1/platform")
    .then((data) => {
      cache = { ...FALLBACK, ...data, site_name: data.site_name || FALLBACK.site_name };
      listeners.forEach((fn) => fn(cache as PlatformConfig));
      return cache;
    })
    .catch(() => FALLBACK)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Re-fetch after an admin changes General Settings. */
export function invalidatePlatformConfig(): void {
  cache = null;
  void load();
}

export function usePlatformConfig(): PlatformConfig {
  const [config, setConfig] = useState<PlatformConfig>(cache ?? FALLBACK);

  useEffect(() => {
    listeners.add(setConfig);
    void load().then(setConfig);
    return () => {
      listeners.delete(setConfig);
    };
  }, []);

  return config;
}
