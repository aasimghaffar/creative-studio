import { useEffect } from "react";
import { usePlatformConfig } from "@/config/use-platform-config";
import { LandingHeader } from "./components/landing-header";
import { Hero } from "./components/hero";
import { Trusted } from "./components/trusted";
import { Tools } from "./components/tools";
import { HowItWorks } from "./components/how-it-works";
import { Pricing } from "./components/pricing";
import { Testimonials } from "./components/testimonials";
import { Faq } from "./components/faq";
import { Cta } from "./components/cta";
import { LandingFooter } from "./components/landing-footer";

/**
 * Marketing landing page — "drafting table" light theme (paper/ink/brass),
 * independent of the app theme toggle. Self-contained header/footer,
 * so it's routed outside RootLayout.
 */
export function LandingPage() {
  const platform = usePlatformConfig();
  useEffect(() => {
    document.title = platform.site_name;
  }, [platform.site_name]);

  return (
    <div className="min-h-svh overflow-x-clip bg-paper font-sans text-ink antialiased selection:bg-brass/30 selection:text-ink">
      <LandingHeader />
      <main>
        <Hero />
        <Trusted />
        <Tools />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <Faq />
        <Cta />
      </main>
      <LandingFooter />
    </div>
  );
}
