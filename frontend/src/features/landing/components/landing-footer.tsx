import { Link } from "react-router";
import { usePlatformConfig } from "@/config/use-platform-config";
import { BrandMark } from "@/components/common/brand-mark";

const columns = [
  {
    title: "AI Tools",
    links: [
      "Logo Generator",
      "Avatar Generator",
      "Tattoo Generator",
      "Image Generator",
      "Flyer Generator",
      "Image Description",
    ],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Press", "Contact"],
  },
  {
    title: "Resources",
    links: ["Docs", "Changelog", "Community", "Status"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Content policy", "DPA"],
  },
];

export function LandingFooter() {
  const platform = usePlatformConfig();
  return (
    <footer className="border-t border-paper-line">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-6">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5" aria-label={`${platform.site_name} home`}>
              <BrandMark />
              <span className="font-display text-[19px] font-semibold tracking-tight text-ink">
                {platform.site_name}
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
              The AI creative studio for teams who care how things look, sound, and read.
            </p>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="eyebrow mb-4 text-[10px] text-ink-soft">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-ink-soft transition-colors hover:text-ink">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-paper-line pt-6 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft sm:flex-row">
          <p>© {new Date().getFullYear()} {platform.site_name} — All rights reserved</p>
          <p>Made for people with taste</p>
        </div>
      </div>
    </footer>
  );
}
