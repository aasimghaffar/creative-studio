/** Domain types for authentication. UI and store depend on these — never on mock data. */

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  createdAt: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
}

/** Thrown by any AuthService implementation for expected auth failures. */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid_credentials"
      | "email_taken"
      | "session_expired"
      | "network"
      | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "AuthError";
  }
}
