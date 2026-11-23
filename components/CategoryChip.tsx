import { CHIP, cn, safeColor } from "@/lib/ui";

/** A user category, always shown in its own stored colour. */
export function CategoryDot({ color, className }: { color: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: safeColor(color) }}
    />
  );
}

export default function CategoryChip({
  name,
  color,
  className,
}: {
  name: string;
  color: string | null | undefined;
  className?: string;
}) {
  const hex = safeColor(color);
  return (
    <span className={cn(CHIP, "max-w-full", className)} style={{ borderColor: `${hex}40` }}>
      <CategoryDot color={hex} />
      <span className="truncate">{name}</span>
    </span>
  );
}
