/**
 * Public API of the auth feature. Everything outside this folder imports
 * from here only — internals (services, mock data, form components) stay private.
 */
export { SignInPage } from "./pages/sign-in-page";
export { SignUpPage } from "./pages/sign-up-page";
export { ProtectedRoute } from "./components/protected-route";
export { AdminRoute } from "./components/admin-route";
export { GuestRoute } from "./components/guest-route";
export { AuthBootstrap } from "./components/auth-bootstrap";
export { UserMenu } from "./components/user-menu";
export { useAuthStore, useAuthUser, useAuthStatus, useIsAuthenticated } from "./stores/auth-store";
export type { User, AuthSession, SignInInput, SignUpInput } from "./types";
