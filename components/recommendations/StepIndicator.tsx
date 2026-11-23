import { CheckIcon } from "@/components/Icons";
import { cn } from "@/lib/ui";

export type WizardStep = "filters" | "base" | "results";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "filters", label: "Preferences" },
  { id: "base", label: "Favorites" },
  { id: "results", label: "Results" },
];

/**
 * Numbered three-step progress. Labels collapse to just the current step on
 * narrow screens so the bar fits at 360px without scrolling.
 */
export default function StepIndicator({
  step,
  canViewResults,
  onSelect,
}: {
  step: WizardStep;
  canViewResults: boolean;
  onSelect: (step: WizardStep) => void;
}) {
  const currentIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <nav aria-label="Recommendation steps" className="mb-6">
      <ol className="flex items-center gap-2">
        {STEPS.map((item, index) => {
          const current = item.id === step;
          const done = index < currentIndex;
          const enabled = item.id !== "results" || canViewResults;
          return (
            <li key={item.id} className={cn("flex items-center gap-2", index < STEPS.length - 1 && "flex-1")}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                disabled={!enabled || current}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "group flex shrink-0 items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-sm transition-[background-color,color] duration-150 ease-snap",
                  current ? "text-paper" : "text-slate enabled:hover:bg-elevated enabled:hover:text-paper",
                  !enabled && "opacity-50"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[11px] tabular-nums",
                    current
                      ? "border-brass bg-brass text-ink"
                      : done
                        ? "border-brass/50 text-brass"
                        : "border-hairline-strong text-slate"
                  )}
                >
                  {done ? <CheckIcon size={12} strokeWidth={2.5} /> : index + 1}
                </span>
                <span className={cn(!current && "sr-only sm:not-sr-only")}>{item.label}</span>
              </button>
              {index < STEPS.length - 1 && (
                <span aria-hidden="true" className={cn("h-px flex-1", done ? "bg-brass/40" : "bg-hairline")} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
