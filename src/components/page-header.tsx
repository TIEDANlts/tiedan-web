import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow && <p className="mb-2 text-sm font-medium text-primary">{eyebrow}</p>}
        <h1 className="font-heading text-3xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
