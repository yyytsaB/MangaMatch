import { CHIP, cn } from "@/lib/ui";

/** Non-interactive tag, e.g. a genre on a card or the detail page. */
export default function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn(CHIP, className)}>{children}</span>;
}
