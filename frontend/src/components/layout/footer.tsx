import { siteConfig } from "@/config/site";
import { usePlatformConfig } from "@/config/use-platform-config";

export function Footer() {
  const platform = usePlatformConfig();
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row md:px-6">
        <p>
          © {new Date().getFullYear()} {platform.site_name}. All rights reserved.
        </p>
        <nav className="flex gap-4" aria-label="Footer">
          <a href={siteConfig.links.github} className="hover:text-foreground" rel="noreferrer" target="_blank">
            GitHub
          </a>
          <a href={siteConfig.links.twitter} className="hover:text-foreground" rel="noreferrer" target="_blank">
            Twitter
          </a>
        </nav>
      </div>
    </footer>
  );
}
