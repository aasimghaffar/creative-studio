import { AuthBootstrap } from "@/features/auth";
import { ThemeProvider } from "./theme-provider";

/**
 * Composes all app-level providers in one place.
 * Add future providers (QueryClientProvider, Toaster, ...) here
 * so main.tsx never grows.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="app-theme">
      <AuthBootstrap>{children}</AuthBootstrap>
    </ThemeProvider>
  );
}
