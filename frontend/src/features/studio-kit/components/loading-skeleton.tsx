import { cn } from "@/lib/utils";

/** Pulsing placeholder tiles while a batch is generating. */
export function LoadingSkeleton({ count, aspectClass }: { count: number; aspectClass: string }) {
  return (
    <div className="grid max-w-2xl grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse rounded-[3px] border border-bp-line bg-gradient-to-br from-bp-panel-2 to-bp-panel",
            aspectClass,
          )}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
