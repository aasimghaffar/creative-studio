import { CircleAlert } from "lucide-react";

/** Inline error banner for service-level auth failures (not field errors). */
export function AuthErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      {message}
    </div>
  );
}
