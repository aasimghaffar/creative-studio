import { Loader2 } from "lucide-react";

/** Full-page loading state used as Suspense fallback for lazy routes. */
export function PageLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center" role="status" aria-label="Loading">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
