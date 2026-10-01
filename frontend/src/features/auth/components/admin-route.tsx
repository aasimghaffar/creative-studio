import { Navigate, Outlet, useLocation } from "react-router";
import { PageLoader } from "@/components/common/page-loader";
import { useAuthStore } from "../stores/auth-store";

/**
 * Role gate for the /admin tree. Runs AFTER authentication:
 *  - not signed in            -> /auth/sign-in (with return location)
 *  - signed in, role != admin -> /app (never the admin dashboard)
 *
 * This is UX-level protection only — every /admin API is independently
 * enforced by the backend AdminMiddleware (403 for non-admins), so
 * bypassing this component gains nothing.
 */
export function AdminRoute() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();

  if (!hasHydrated) return <PageLoader />;

  if (status !== "authenticated") {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
