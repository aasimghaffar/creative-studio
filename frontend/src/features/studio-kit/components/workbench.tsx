/** Shared studio layout: header strip, 340px input rail, canvas. */
export function Workbench({
  eyebrow,
  title,
  description,
  panel,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  panel: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col overflow-hidden rounded-md border bg-card lg:h-[calc(100svh-6.5rem)]">
      <div className="border-b px-4 py-4 sm:px-6 sm:py-5">
        <p className="eyebrow text-[10.5px] text-brass">{eyebrow}</p>
        <h1 className="mt-1 break-words font-display text-xl font-medium sm:text-2xl">{title}</h1>
        <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b lg:w-[340px] lg:border-b-0 lg:border-r">{panel}</aside>
        {children}
      </div>
    </div>
  );
}
