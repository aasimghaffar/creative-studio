import { env } from "@/lib/env";
import type { AuthService } from "./auth-service";
import { apiAuthService } from "./api-auth-service";
import { mockAuthService } from "./mock-auth-service";

export type { AuthService } from "./auth-service";

/**
 * ── THE SWAP POINT ──────────────────────────────────────────────────
 * Driven by VITE_AUTH_DRIVER:
 *   "api"  (default) — the real PHP backend (backend/, /api/v1/auth/*)
 *   "mock"           — the in-browser mock (no server required)
 *
 * Set VITE_AUTH_DRIVER=mock in .env.local to demo without the backend.
 * Store, forms, and routes never change.
 */
export const authService: AuthService =
  env.VITE_AUTH_DRIVER === "mock" ? mockAuthService : apiAuthService;
