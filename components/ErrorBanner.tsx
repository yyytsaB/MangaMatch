import { AlertIcon } from "@/components/Icons";
import { cn } from "@/lib/ui";

export default function ErrorBanner({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger",
        className
      )}
    >
      <AlertIcon className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
