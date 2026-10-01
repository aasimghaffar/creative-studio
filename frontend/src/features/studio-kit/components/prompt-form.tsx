/** Standard left-rail layout: scrollable fields + pinned footer (Generate area). */
export function PromptForm({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">{children}</div>
      <div className="border-t p-5">{footer}</div>
    </div>
  );
}
