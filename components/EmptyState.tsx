import { cn } from "@/lib/ui";

/** Quiet dashed panel shown wherever a list has nothing to show. */
export default function EmptyState({
  icon,
  title,
  children,
  actions,
  className,
}: {
  icon?: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-dashed border-hairline px-6 py-14 text-center", className)}>
      {icon && (
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-hairline bg-shelf text-slate">
          {icon}
        </div>
      )}
      {title && <h2 className="mb-1.5 font-display text-lg font-semibold text-paper">{title}</h2>}
      {children && <div className="mx-auto max-w-md text-sm leading-relaxed text-slate">{children}</div>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}
