import { z } from "zod";

/**
 * Validate environment variables at startup so misconfiguration
 * fails loudly at boot instead of silently at runtime.
 */
const envSchema = z.object({
  VITE_APP_NAME: z.string().default("AI Creative Studio"),
  VITE_API_URL: z.string().url().default("http://localhost:8000/api"),
  /** "api" = real PHP backend, "mock" = in-browser auth (no server needed). */
  VITE_AUTH_DRIVER: z.enum(["api", "mock"]).default("api"),
});

export const env = envSchema.parse(import.meta.env);
