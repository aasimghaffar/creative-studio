import { Reveal } from "./reveal";

interface SectionHeadingProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "center" | "left";
}

export function SectionHeading({ eyebrow, title, description, align = "center" }: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <Reveal className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="eyebrow mb-4 text-brass-deep">{eyebrow}</p>
      <h2 className="font-display text-3xl font-medium leading-tight tracking-[-0.01em] text-ink sm:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{description}</p>}
    </Reveal>
  );
}
