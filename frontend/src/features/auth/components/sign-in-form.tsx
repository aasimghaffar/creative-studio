import { useEffect } from "react";
import { homeRouteFor } from "../lib/home-route";
import { claimSelectedPlan } from "@/features/billing/services/billing-service";
import { Link, useLocation, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuthStore } from "../stores/auth-store";
import { signInSchema, type SignInValues } from "../schemas/auth-schemas";
import { PasswordInput } from "./password-input";
import { AuthErrorAlert } from "./auth-error-alert";

export function SignInForm() {
  const signIn = useAuthStore((s) => s.signIn);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? null;

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => clearError, [clearError]);

  async function onSubmit(values: SignInValues) {
    try {
      await signIn(values);
      const user = useAuthStore.getState().user;
      // A plan picked on the landing page routes straight into REAL
      // checkout — nothing is granted before payment. Free plans are
      // switched by the checkout page without charging.
      const stored = user?.role !== "admin" ? claimSelectedPlan() : null;
      if (stored) {
        navigate(`/app/checkout?plan=${encodeURIComponent(stored.slug)}&cycle=${stored.cycle}`, { replace: true });
        return;
      }
      // Role decides the landing page; a deep link the user was heading
      // to still wins (AdminRoute bounces non-admins out of /admin).
      navigate(from ?? homeRouteFor(user), { replace: true });
    } catch {
      // Service error is surfaced via the store → AuthErrorAlert.
    }
  }

  const submitting = status === "loading";

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to continue to your studio</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <AuthErrorAlert message={error} />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="you@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete="current-password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        No account?
        <Link to="/auth/sign-up" className="ml-1 font-medium text-foreground underline-offset-4 hover:underline">
          Create one
        </Link>
      </CardFooter>
    </Card>
  );
}
