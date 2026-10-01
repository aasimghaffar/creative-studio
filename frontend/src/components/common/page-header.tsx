/** Standard page heading: mono eyebrow + Fraunces title + description. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow text-[10.5px] text-brass">{eyebrow}</p>
        <h1 className="mt-1 break-words font-display text-xl font-medium sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex min-w-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
