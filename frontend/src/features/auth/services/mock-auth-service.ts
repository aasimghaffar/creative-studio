import type { AuthService } from "./auth-service";
import { AuthError, type AuthSession, type SignInInput, type SignUpInput, type User } from "../types";

/**
 * Mock implementation for development without a backend.
 *
 * - Simulates network latency
 * - Keeps a tiny "user database" in localStorage so sign-ups survive reloads
 * - Issues fake tokens that getCurrentUser can validate
 *
 * Delete this file when the real API lands — nothing outside the services
 * folder imports it.
 */

const LATENCY_MS = 650;
const DB_KEY = "prism.mock.users";

interface StoredUser extends User {
  /** Obfuscated only — this is a mock, never do this for real. */
  passwordHash: string;
}

const hash = (value: string) => btoa(`prism:${value}`);
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readDb(): StoredUser[] {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeDb(users: StoredUser[]) {
  localStorage.setItem(DB_KEY, JSON.stringify(users));
}

/** Seed a demo account on first run: demo@prism.studio / demo1234 */
function ensureSeed() {
  const users = readDb();
  if (!users.some((u) => u.email === "demo@prism.studio")) {
    users.push({
      id: "usr_demo",
      name: "Demo User",
      email: "demo@prism.studio",
      createdAt: new Date().toISOString(),
      passwordHash: hash("demo1234"),
    });
    writeDb(users);
  }
}

function issueToken(userId: string): string {
  return `mock.${btoa(JSON.stringify({ sub: userId, iat: Date.now() }))}`;
}

function toPublicUser({ passwordHash: _ignored, ...user }: StoredUser): User {
  return user;
}

export const mockAuthService: AuthService = {
  async signIn({ email, password }: SignInInput): Promise<AuthSession> {
    ensureSeed();
    await delay(LATENCY_MS);

    const user = readDb().find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.passwordHash !== hash(password)) {
      throw new AuthError("Invalid email or password.", "invalid_credentials");
    }
    return { user: toPublicUser(user), accessToken: issueToken(user.id) };
  },

  async signUp({ name, email, password }: SignUpInput): Promise<AuthSession> {
    ensureSeed();
    await delay(LATENCY_MS);

    const users = readDb();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new AuthError("An account with this email already exists.", "email_taken");
    }

    const user: StoredUser = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      name,
      email,
      createdAt: new Date().toISOString(),
      passwordHash: hash(password),
    };
    writeDb([...users, user]);

    return { user: toPublicUser(user), accessToken: issueToken(user.id) };
  },

  async signOut(): Promise<void> {
    await delay(200);
    // Nothing server-side to invalidate in the mock.
  },

  async getCurrentUser(accessToken: string): Promise<User | null> {
    ensureSeed();
    await delay(300);
    try {
      const payload = JSON.parse(atob(accessToken.replace(/^mock\./, ""))) as { sub: string };
      const user = readDb().find((u) => u.id === payload.sub);
      return user ? toPublicUser(user) : null;
    } catch {
      return null;
    }
  },
};
