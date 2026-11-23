// Shared Tailwind class recipes built on the design tokens in
// app/globals.css. Keep visual decisions here so every page speaks the same
// language: tonal surfaces, 1px hairlines, one brass accent, and snappy
// transitions on explicit properties only (never `transition-all`).

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Colour/border/opacity transitions plus the press-scale, 150ms ease-out. */
const INTERACTIVE =
  "transition-[background-color,border-color,color,opacity,scale] duration-150 ease-snap motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const BUTTON_BASE = cn(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border font-medium whitespace-nowrap select-none",
  INTERACTIVE
);

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-brass bg-brass text-ink hover:border-brass-hover hover:bg-brass-hover",
  secondary: "border-hairline bg-shelf text-paper hover:border-hairline-strong hover:bg-elevated",
  ghost: "border-transparent bg-transparent text-slate hover:bg-elevated hover:text-paper",
  danger: "border-danger/35 bg-danger/10 text-danger hover:border-[#EF4444] hover:bg-[#EF4444] hover:text-white",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-11 px-6 text-sm",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md"): string {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size]);
}

/** Square icon-only control (needs an aria-label). */
export const ICON_BUTTON = cn(
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate hover:bg-elevated hover:text-paper",
  INTERACTIVE
);

/** Toggle pill (filter options, genre picks). Pair with aria-pressed. */
export function pillClass(active: boolean): string {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full border",
    INTERACTIVE,
    active
      ? "border-brass/50 bg-brass/10 text-brass"
      : "border-hairline bg-shelf text-slate hover:border-hairline-strong hover:text-paper"
  );
}

/** Row button inside a filter list (sidebar statuses, genres, tags). */
export function filterRowClass(active: boolean): string {
  return cn(
    "flex w-full min-h-9 items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left text-sm",
    "transition-[background-color,color] duration-150 ease-snap",
    active ? "bg-elevated text-paper" : "text-slate hover:bg-elevated/60 hover:text-paper"
  );
}

/** Non-interactive tag, e.g. a genre on a card or detail page. */
export const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border border-hairline bg-ink/40 px-2.5 py-0.5 text-xs text-slate";

/** Raised panel: cards, sidebars, metadata blocks. Flat by default. */
export const PANEL = "rounded-xl border border-hairline bg-shelf";

export const INPUT =
  "h-10 w-full rounded-lg border border-hairline bg-ink px-3.5 text-sm text-paper placeholder:text-muted transition-[border-color] duration-150 ease-snap hover:border-hairline-strong focus:border-brass/70 focus-visible:outline-none";

/** Uppercase mono micro-label above a control or metadata value. */
export const LABEL = "font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-slate";

/** Mono figure for counts, scores, and ratings. */
export const COUNT = "font-mono text-[11px] tabular-nums";

/** Exact same poster rhythm on Library, Search, and their skeletons. */
export const POSTER_GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5";

/** Page container shared by Nav and every route so edges align. */
export const CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  reading: { label: "Reading", className: "border-reading/30 bg-reading/10 text-reading" },
  completed: { label: "Completed", className: "border-completed/30 bg-completed/10 text-completed" },
  finished: { label: "Completed", className: "border-completed/30 bg-completed/10 text-completed" },
  planning: { label: "Planning", className: "border-planning/30 bg-planning/10 text-planning" },
  releasing: { label: "Releasing", className: "border-releasing/30 bg-releasing/10 text-releasing" },
  hiatus: { label: "Hiatus", className: "border-hiatus/30 bg-hiatus/10 text-hiatus" },
  not_yet_released: { label: "Upcoming", className: "border-hairline bg-ink/60 text-slate" },
  cancelled: { label: "Cancelled", className: "border-danger/30 bg-danger/10 text-danger" },
};

/** Label + tint for a reading status or an AniList publication status. */
export function statusBadge(status: string | null | undefined): { label: string; className: string } {
  const normalized = (status ?? "unknown").toLowerCase();
  return STATUS_STYLES[normalized] ?? {
    label: status ?? "Unknown",
    className: "border-hairline bg-ink/60 text-slate",
  };
}

/** Swatches offered for new categories; the first is the schema default. */
export const CATEGORY_COLORS = [
  { name: "Brass", hex: "#E8C77E" },
  { name: "Blue", hex: "#60A5FA" },
  { name: "Pink", hex: "#F472B6" },
  { name: "Green", hex: "#34D399" },
  { name: "Violet", hex: "#A78BFA" },
  { name: "Orange", hex: "#FB923C" },
  { name: "Slate", hex: "#94A6C2" },
] as const;

/** Category colours come from user data; only trust well-formed hex values. */
export function safeColor(color: string | null | undefined, fallback = "#E8C77E"): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}
