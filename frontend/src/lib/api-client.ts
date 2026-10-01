import { env } from "@/lib/env";

/**
 * Authenticated JSON client for the PHP backend.
 *
 * - Unwraps the standard envelope { success, message, data, errors, meta }
 * - Attaches the Bearer token stored by the auth service
 * - On 401, rotates the refresh token once and retries the request
 *
 * Shares the token storage key with api-auth-service.ts.
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

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function readTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: StoredTokens): void {
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

async function rawRequest<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.VITE_API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection.", 0);
  }

  const body = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok || body === null || !body.success) {
    const firstFieldError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
    throw new ApiError(firstFieldError ?? body?.message ?? "Something went wrong.", response.status);
  }

  return body.data;
}

async function tryRefresh(): Promise<string | null> {
  const tokens = readTokens();
  if (!tokens?.refresh) return null;

  try {
    const bundle = await rawRequest<{ access_token: string; refresh_token: string }>(
      "/v1/auth/refresh-token",
      { method: "POST", body: JSON.stringify({ refresh_token: tokens.refresh }) },
      null,
    );
    writeTokens({ access: bundle.access_token, refresh: bundle.refresh_token });
    return bundle.access_token;
  } catch {
    return null;
  }
}

/** Authenticated request with envelope unwrapping and one 401 retry. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readTokens()?.access ?? null;

  try {
    return await rawRequest<T>(path, init, token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const renewed = await tryRefresh();
      if (renewed) {
        return rawRequest<T>(path, init, renewed);
      }
    }
    throw error;
  }
}

/** Download a (possibly cross-origin) file URL as a local save. */
export async function downloadFile(url: string, filename: string): Promise<void> {
  // Storage files (absolute /storage/* URLs) must stream THROUGH the
  // API: direct fetch() of static files fails CORS (rendering via <img>
  // works, fetch+blob does not — the cause of every "Download failed").
  let target = url;
  if (url.startsWith("http") && url.includes("/storage/")) {
    target = `/v1/files/download?src=${encodeURIComponent(url)}`;
  }
  const isApiPath = !target.startsWith("http");
  const absolute = isApiPath ? `${env.VITE_API_URL}${target}` : target;

  try {
    const response = await fetch(absolute, {
      headers: isApiPath && readTokens()?.access ? { Authorization: `Bearer ${readTokens()?.access}` } : {},
    });
    if (!response.ok) throw new ApiError("Download failed.", response.status);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    if (isApiPath) throw error; // API failures are real errors (401, 404…)
    // Storage files can be CORS-blocked for fetch even though <img> shows
    // them — hand the URL to the browser instead of failing.
    const a = document.createElement("a");
    a.href = absolute;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
