import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/components/layout/root-layout";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthLayout } from "@/components/layout/auth-layout";
import { RouteError } from "@/components/common/route-error";
import { NotFound } from "@/components/common/not-found";
import { AdminRoute, ProtectedRoute, GuestRoute } from "@/features/auth";

/**
 * Route tree (React Router v7, data mode).
 *
 *  - "/"        → LandingPage (self-contained header/footer)
 *  - RootLayout → shared marketing shell for future public pages
 *  - /app       → ProtectedRoute → AppLayout (requires a session)
 *  - /auth      → GuestRoute → AuthLayout (signed-in users are bounced to /app)
 *
 * Pages load via `lazy` so each route becomes its own chunk.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: async () => {
          const { LandingPage } = await import("@/features/landing");
          return { Component: LandingPage };
        },
      },
      {
        element: <RootLayout />,
        children: [
          // Future shared-shell marketing pages, e.g. { path: "blog", lazy: ... }
        ],
      },
    ],
  },
  {
    path: "/app",
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            lazy: async () => {
              const { DashboardPage } = await import("@/features/dashboard");
              return { Component: DashboardPage };
            },
          },
          {
            path: "logos",
            lazy: async () => {
              const { LogoGeneratorPage } = await import("@/features/logo-generator");
              return { Component: LogoGeneratorPage };
            },
          },
          {
            path: "avatars",
            lazy: async () => {
              const { AvatarGeneratorPage } = await import("@/features/avatar-generator");
              return { Component: AvatarGeneratorPage };
            },
          },
          {
            path: "images",
            lazy: async () => {
              const { ImageGeneratorPage } = await import("@/features/image-generator");
              return { Component: ImageGeneratorPage };
            },
          },
          {
            path: "flyers",
            lazy: async () => {
              const { FlyerGeneratorPage } = await import("@/features/flyer-generator");
              return { Component: FlyerGeneratorPage };
            },
          },
          {
            path: "image-description",
            lazy: async () => {
              const { ImageDescriptionPage } = await import("@/features/image-description");
              return { Component: ImageDescriptionPage };
            },
          },
          {
            path: "tattoos",
            lazy: async () => {
              const { TattooGeneratorPage } = await import("@/features/tattoo-generator");
              return { Component: TattooGeneratorPage };
            },
          },
          {
            path: "history",
            lazy: async () => {
              const { HistoryPage } = await import("@/features/history");
              return { Component: HistoryPage };
            },
          },
          {
            path: "files",
            lazy: async () => {
              const { FilesPage } = await import("@/features/files");
              return { Component: FilesPage };
            },
          },
          {
            path: "favorites",
            lazy: async () => {
              const { FavoritesPage } = await import("@/features/favorites");
              return { Component: FavoritesPage };
            },
          },
          {
            path: "notifications",
            lazy: async () => {
              const { NotificationsPage } = await import("@/features/notifications");
              return { Component: NotificationsPage };
            },
          },
          {
            path: "billing",
            lazy: async () => {
              const { BillingPage } = await import("@/features/billing");
              return { Component: BillingPage };
            },
          },
          {
            path: "checkout",
            lazy: async () => {
              const { CheckoutPage } = await import("@/features/billing");
              return { Component: CheckoutPage };
            },
          },
          {
            path: "profile",
            lazy: async () => {
              const { ProfilePage } = await import("@/features/profile");
              return { Component: ProfilePage };
            },
          },
          {
            path: "settings",
            lazy: async () => {
              const { SettingsPage } = await import("@/features/settings");
              return { Component: SettingsPage };
            },
          },
          {
            path: "help",
            lazy: async () => {
              const { SupportPage } = await import("@/features/support");
              return { Component: SupportPage };
            },
          },
          // More protected product routes go here
        ],
      },
    ],
  },
  {
    path: "/auth",
    element: <GuestRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: "sign-in",
            lazy: async () => {
              const { SignInPage } = await import("@/features/auth");
              return { Component: SignInPage };
            },
          },
          {
            path: "sign-up",
            lazy: async () => {
              const { SignUpPage } = await import("@/features/auth");
              return { Component: SignUpPage };
            },
          },
        ],
      },
    ],
  },
  {
    path: "/admin",
    element: <AdminRoute />,
    errorElement: <RouteError />,
    children: [
      {
        lazy: async () => {
          const { AdminLayout } = await import("@/features/admin");
          return { Component: AdminLayout };
        },
        children: [
          {
            index: true,
            lazy: async () => {
              const { AdminHomePage } = await import("@/features/admin");
              return { Component: AdminHomePage };
            },
          },
          {
            path: "users",
            lazy: async () => {
              const { AdminUsersPage } = await import("@/features/admin");
              return { Component: AdminUsersPage };
            },
          },
          {
            path: "users/:userId",
            lazy: async () => {
              const { AdminUserDetailsPage } = await import("@/features/admin");
              return { Component: AdminUserDetailsPage };
            },
          },
          {
            path: "ai-providers",
            lazy: async () => {
              const { AiProvidersPage } = await import("@/features/admin");
              return { Component: AiProvidersPage };
            },
          },
          {
            path: "ai-tools",
            lazy: async () => {
              const { AiToolsPage } = await import("@/features/admin");
              return { Component: AiToolsPage };
            },
          },
                              {
            path: "plans",
            lazy: async () => {
              const { AdminPlansPage } = await import("@/features/admin");
              return { Component: AdminPlansPage };
            },
          },
          {
            path: "payments",
            lazy: async () => {
              const { AdminPaymentsPage } = await import("@/features/admin");
              return { Component: AdminPaymentsPage };
            },
          },
          {
            path: "credits",
            lazy: async () => {
              const { AdminCreditsPage } = await import("@/features/admin");
              return { Component: AdminCreditsPage };
            },
          },
          {
            path: "announcements",
            lazy: async () => {
              const { AdminAnnouncementsPage } = await import("@/features/admin");
              return { Component: AdminAnnouncementsPage };
            },
          },
          {
            path: "help-center",
            lazy: async () => {
              const { AdminHelpCenterPage } = await import("@/features/admin");
              return { Component: AdminHelpCenterPage };
            },
          },
          {
            path: "faqs",
            lazy: async () => {
              const { AdminFaqsPage } = await import("@/features/admin");
              return { Component: AdminFaqsPage };
            },
          },
                    {
            path: "ai-usage",
            lazy: async () => {
              const { AdminAiUsagePage } = await import("@/features/admin");
              return { Component: AdminAiUsagePage };
            },
          },
                    {
            path: "credits-usage",
            lazy: async () => {
              const { AdminCreditsUsagePage } = await import("@/features/admin");
              return { Component: AdminCreditsUsagePage };
            },
          },
          {
            path: "file-manager",
            lazy: async () => {
              const { AdminFileManagerPage } = await import("@/features/admin");
              return { Component: AdminFileManagerPage };
            },
          },
          {
            path: "storage-provider",
            lazy: async () => {
              const { AdminStorageProviderPage } = await import("@/features/admin");
              return { Component: AdminStorageProviderPage };
            },
          },
          {
            path: "payment-settings",
            lazy: async () => {
              const { AdminPaymentSettingsPage } = await import("@/features/admin");
              return { Component: AdminPaymentSettingsPage };
            },
          },
          {
            path: "notification-settings",
            lazy: async () => {
              const { AdminNotificationSettingsPage } = await import("@/features/admin");
              return { Component: AdminNotificationSettingsPage };
            },
          },
                    {
            path: "email",
            lazy: async () => {
              const { AdminEmailPage } = await import("@/features/admin");
              return { Component: AdminEmailPage };
            },
          },
          {
            path: "security",
            lazy: async () => {
              const { AdminSecurityPage } = await import("@/features/admin");
              return { Component: AdminSecurityPage };
            },
          },
          {
            path: "support",
            lazy: async () => {
              const { AdminSupportPage } = await import("@/features/admin");
              return { Component: AdminSupportPage };
            },
          },
          {
            path: "general",
            lazy: async () => {
              const { AdminGeneralPage } = await import("@/features/admin");
              return { Component: AdminGeneralPage };
            },
          },
                                      ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
