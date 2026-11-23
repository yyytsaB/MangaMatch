import { LABEL, cn } from "@/lib/ui";

/**
 * Compact inner-page masthead: eyebrow (+ count/context), plain-ink
 * headline, an optional one-line subtitle, and right-aligned actions.
 */
export default function PageHeader({
  eyebrow,
  meta,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  meta?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-4 border-b border-hairline pb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2">
          <span className={cn(LABEL, "text-brass")}>{eyebrow}</span>
          {meta && (
            <>
              <span aria-hidden="true" className="h-3 w-px bg-hairline-strong" />
              <span className={LABEL}>{meta}</span>
            </>
          )}
        </p>
        <h1 className="mt-2 font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-paper sm:text-[2rem]">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
