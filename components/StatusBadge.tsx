import { cn, statusBadge } from "@/lib/ui";

/** Mono status pill (reading status or publication status). */
export default function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const { label, className: tint } = statusBadge(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em]",
        tint,
        className
      )}
    >
      {label}
    </span>
  );
}
