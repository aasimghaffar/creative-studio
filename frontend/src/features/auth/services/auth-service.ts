import type { AuthSession, SignInInput, SignUpInput, User } from "../types";

/**
 * The contract every auth backend must fulfil.
 *
 * The store and UI depend ONLY on this interface. Swapping mock → real REST
 * API means writing one new implementation and changing one export in
 * `./index.ts`. Nothing else in the app changes.
 */
export interface AuthService {
  signIn(input: SignInInput): Promise<AuthSession>;
  signUp(input: SignUpInput): Promise<AuthSession>;
  signOut(): Promise<void>;
  /** Validate a persisted token and return the current user, or null if invalid. */
  getCurrentUser(accessToken: string): Promise<User | null>;
}
