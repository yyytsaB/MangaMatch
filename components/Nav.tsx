"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CompassIcon, LibraryIcon, SparklesIcon } from "@/components/Icons";
import { CONTAINER, cn } from "@/lib/ui";

const links = [
  { href: "/library", label: "Library", Icon: LibraryIcon },
  { href: "/search", label: "Search", Icon: CompassIcon },
  { href: "/recommendations", label: "Recommend", Icon: SparklesIcon },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="sticky top-0 z-40 border-b border-hairline bg-ink/80 backdrop-blur-md">
      <div className={cn(CONTAINER, "flex h-14 items-center justify-between gap-4")}>
        <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="MangaMatch home">
          <Image
            src="/logo-icon.png"
            width={28}
            height={28}
            alt=""
            className="h-7 w-7 rounded-lg border border-hairline object-cover"
          />
          <span className="hidden font-display text-base font-semibold tracking-[-0.01em] text-paper sm:inline">
            MangaMatch
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ href, label, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm transition-[background-color,color] duration-150 ease-snap sm:px-3.5",
                  isActive ? "bg-elevated text-paper" : "text-slate hover:bg-elevated/60 hover:text-paper"
                )}
              >
                <Icon className={cn("hidden sm:block", isActive && "text-brass")} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
