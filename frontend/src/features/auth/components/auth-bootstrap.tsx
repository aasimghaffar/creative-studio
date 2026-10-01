import { useEffect } from "react";
import { useAuthStore } from "../stores/auth-store";

/**
 * Runs once on app boot: re-validates the persisted session against the
 * auth service. A plan picked on the landing page is NOT consumed here —
 * the sign-in / sign-up handlers route it into real checkout.
 */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const refreshSession = useAuthStore((s) => s.refreshSession);

  useEffect(() => {
    if (hasHydrated) void refreshSession();
  }, [hasHydrated, refreshSession]);

  return <>{children}</>;
}
