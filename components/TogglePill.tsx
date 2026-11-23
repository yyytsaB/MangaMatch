"use client";

import { cn, pillClass } from "@/lib/ui";

/** Pressable filter pill; the pressed state is exposed to assistive tech. */
export default function TogglePill({
  active,
  onClick,
  children,
  disabled,
  className = "h-8 px-3.5 text-xs",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(pillClass(active), className)}
    >
      {children}
    </button>
  );
}
