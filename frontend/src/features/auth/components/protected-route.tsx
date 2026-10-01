import { Navigate, Outlet, useLocation } from "react-router";
import { PageLoader } from "@/components/common/page-loader";
import { useAuthStore } from "../stores/auth-store";

/**
 * Gate for authenticated areas. Wrap layouts, not individual pages:
 *   { element: <ProtectedRoute />, children: [{ element: <AppLayout />, ... }] }
 *
 * Waits for store hydration before deciding, so a signed-in user never
 * flashes to /auth/sign-in on a hard refresh. Preserves the attempted
 * location so sign-in can return the user to where they were headed.
 */
export function ProtectedRoute() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");
  const location = useLocation();

  if (!hasHydrated) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
