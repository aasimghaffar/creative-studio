import type { User } from "../types";

/** Role-aware landing route — admins live in /admin, everyone else in /app. */
export function homeRouteFor(user: User | null | undefined): string {
  return user?.role === "admin" ? "/admin" : "/app";
}
