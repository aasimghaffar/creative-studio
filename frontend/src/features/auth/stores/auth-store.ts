import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { authService } from "../services";
import { AuthError, type SignInInput, type SignUpInput, type User } from "../types";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;
  error: string | null;
  /** True once the persisted session has been read from localStorage. */
  hasHydrated: boolean;

  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Merge fresh fields into the persisted user (e.g. after a profile save). */
  updateUser: (patch: Partial<User>) => void;
  /** Re-validate the persisted token against the service (call on app boot). */
  refreshSession: () => Promise<void>;
  clearError: () => void;
  setHasHydrated: (value: boolean) => void;
}

function toMessage(error: unknown): string {
  if (error instanceof AuthError) return error.message;
  return "Something went wrong. Please try again.";
}

/**
 * Auth state (Zustand v5).
 * Talks exclusively to `authService` — it has no idea whether that's the
 * mock or a real API. Only `user` and `accessToken` are persisted.
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        accessToken: null,
        status: "idle",
        error: null,
        hasHydrated: false,

        signIn: async (input) => {
          set({ status: "loading", error: null }, false, "auth/signIn:start");
          try {
            const session = await authService.signIn(input);
            set(
              { user: session.user, accessToken: session.accessToken, status: "authenticated" },
              false,
              "auth/signIn:success",
            );
          } catch (error) {
            set(
              { status: "unauthenticated", error: toMessage(error) },
              false,
              "auth/signIn:error",
            );
            throw error;
          }
        },

        signUp: async (input) => {
          set({ status: "loading", error: null }, false, "auth/signUp:start");
          try {
            const session = await authService.signUp(input);
            set(
              { user: session.user, accessToken: session.accessToken, status: "authenticated" },
              false,
              "auth/signUp:success",
            );
          } catch (error) {
            set(
              { status: "unauthenticated", error: toMessage(error) },
              false,
              "auth/signUp:error",
            );
            throw error;
          }
        },

        updateUser: (patch) =>
          set(
            (state) => (state.user ? { user: { ...state.user, ...patch } } : {}),
            false,
            "auth/updateUser",
          ),

        signOut: async () => {
          await authService.signOut().catch(() => undefined);
          set(
            { user: null, accessToken: null, status: "unauthenticated", error: null },
            false,
            "auth/signOut",
          );
        },

        refreshSession: async () => {
          const { accessToken } = get();
          if (!accessToken) {
            set({ status: "unauthenticated" }, false, "auth/refresh:noToken");
            return;
          }
          const user = await authService.getCurrentUser(accessToken);
          if (user) {
            set({ user, status: "authenticated" }, false, "auth/refresh:valid");
          } else {
            set(
              { user: null, accessToken: null, status: "unauthenticated" },
              false,
              "auth/refresh:invalid",
            );
          }
        },

        clearError: () => set({ error: null }, false, "auth/clearError"),

        setHasHydrated: (value) =>
          set(
            (state) => ({
              hasHydrated: value,
              status: state.user ? "authenticated" : "unauthenticated",
            }),
            false,
            "auth/hydrated",
          ),
      }),
      {
        name: "auth-store",
        partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
        onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      },
    ),
    { name: "AuthStore", enabled: import.meta.env.DEV },
  ),
);

/* Narrow selector hooks — components subscribe to exactly what they need. */
export const useAuthUser = () => useAuthStore((s) => s.user);
export const useAuthStatus = () => useAuthStore((s) => s.status);
export const useIsAuthenticated = () => useAuthStore((s) => s.status === "authenticated");
