import { Navigate, Outlet } from "react-router";
import { homeRouteFor } from "../lib/home-route";
import { PageLoader } from "@/components/common/page-loader";
import { useAuthStore } from "../stores/auth-store";

/** Inverse gate: keeps signed-in users out of /auth pages. */
export function GuestRoute() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");
  const user = useAuthStore((s) => s.user);

  if (!hasHydrated) return <PageLoader />;
  if (isAuthenticated) return <Navigate to={homeRouteFor(user)} replace />;

  return <Outlet />;
}
