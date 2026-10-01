import { env } from "@/lib/env";
import type { AuthService } from "./auth-service";
import { AuthError, type AuthSession, type SignInInput, type SignUpInput, type User } from "../types";

/**
 * Real REST implementation against the PHP backend (backend/).
 *
 * Contract: every endpoint returns the envelope
 *   { success, message, data, errors, meta }
 * Auth bundles live in data: { user, access_token, refresh_token, expires_in }.
 *
 * The refresh token is owned by this module (not the store): it's persisted
 * here, rotated on every /refresh-token call, and used to transparently
 * retry /me once when the access token has expired.
 */

const TOKENS_KEY = "prism.auth.tokens";

interface StoredTokens {
  access: string;
  refresh: string;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors: Record<string, string[]> | null;
}

interface ApiUser {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: string;
  status: string;
  email_verified: boolean;
  created_at: string;
}

interface TokenBundle {
  user: ApiUser;
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

function readTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: StoredTokens | null): void {
  if (tokens === null) {
    localStorage.removeItem(TOKENS_KEY);
  } else {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  }
}

function toUser(user: ApiUser): User {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url ?? undefined,
    role: user.role,
    createdAt: user.created_at,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.VITE_API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new AuthError("Could not reach the server. Check your connection.", "network");
  }

  const body = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok || body === null || !body.success) {
    const message = body?.message;
    // Surface the first field error from a 422 validation bag, if present.
    const firstFieldError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;

    if (response.status === 401) {
      throw new AuthError(message ?? "Invalid email or password.", "invalid_credentials");
    }
    if (response.status === 409) {
      throw new AuthError(message ?? "An account with this email already exists.", "email_taken");
    }
    throw new AuthError(firstFieldError ?? message ?? "Something went wrong. Please try again.", "unknown");
  }

  return body.data;
}

function toSession(bundle: TokenBundle): AuthSession {
  writeTokens({ access: bundle.access_token, refresh: bundle.refresh_token });

  return { user: toUser(bundle.user), accessToken: bundle.access_token };
}

/** Rotate the refresh token; returns the new access token or null. */
async function tryRefresh(): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens?.refresh) return null;

  try {
    const bundle = await request<TokenBundle>("/v1/auth/refresh-token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: tokens.refresh }),
    });
    writeTokens({ access: bundle.access_token, refresh: bundle.refresh_token });
    return bundle.access_token;
  } catch {
    writeTokens(null);
    return null;
  }
}

async function fetchMe(accessToken: string): Promise<User> {
  const { user } = await request<{ user: ApiUser }>("/v1/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return toUser(user);
}

export const apiAuthService: AuthService = {
  async signIn(input: SignInInput): Promise<AuthSession> {
    const bundle = await request<TokenBundle>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: input.email, password: input.password }),
    });

    return toSession(bundle);
  },

  async signUp(input: SignUpInput): Promise<AuthSession> {
    const bundle = await request<TokenBundle>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: input.name, email: input.email, password: input.password }),
    });

    return toSession(bundle);
  },

  async signOut(): Promise<void> {
    const tokens = readTokens();
    writeTokens(null);

    if (!tokens) return;

    await request<null>("/v1/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokens.access}` },
      body: JSON.stringify({ refresh_token: tokens.refresh }),
    }).catch(() => {
      // Best-effort — the local session is already cleared.
    });
  },

  async getCurrentUser(accessToken: string): Promise<User | null> {
    // Prefer this module's freshest access token over the store's copy.
    const token = readTokens()?.access ?? accessToken;

    try {
      return await fetchMe(token);
    } catch (error) {
      if (error instanceof AuthError && error.code === "invalid_credentials") {
        const renewed = await tryRefresh();
        if (renewed) {
          try {
            return await fetchMe(renewed);
          } catch {
            return null;
          }
        }
      }
      return null;
    }
  },
};
