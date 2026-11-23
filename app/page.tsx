import Link from "next/link";
import { prisma } from "@/lib/db";
import CoverImage from "@/components/CoverImage";
import EmptyState from "@/components/EmptyState";
import { ArrowRightIcon, CompassIcon, LibraryIcon, SparklesIcon } from "@/components/Icons";
import { CONTAINER, LABEL, PANEL, buttonClass, cn } from "@/lib/ui";
import { getSessionId } from "@/lib/session";
import { seedStarterLibraryIfEmpty } from "@/lib/starter-data";

export default async function HomePage() {
  const sessionId = await getSessionId();
  if (sessionId) {
    await seedStarterLibraryIfEmpty(sessionId);
  }

  const recentManga = await prisma.manga.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-hairline">
        {/* Cover collage, pushed far back so the headline owns the room. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('/hero-bg.png')" }}
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/80 via-ink/90 to-ink" />

        <div className={cn(CONTAINER, "py-20 sm:py-28")}>
          <div className="max-w-2xl animate-enter">
            <p className={cn(LABEL, "mb-5 text-brass")}>Track · Filter · Discover</p>
            <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] leading-[1.1] font-semibold tracking-[-0.025em] text-paper">
              Your manga, organized —{" "}
              <span className="text-gradient-gold">your next read, found.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate">
              Keep a shelf of what you&apos;re reading and what you&apos;ve finished, then get recommendations
              grounded in what you actually rate highly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/library" className={buttonClass("primary", "lg")}>
                <LibraryIcon />
                Open my library
              </Link>
              <Link href="/search" className={buttonClass("secondary", "lg")}>
                <CompassIcon />
                Browse manga
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="recent-heading" className={cn(CONTAINER, "py-12 sm:py-16")}>
        {recentManga.length > 0 ? (
          <>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 id="recent-heading" className="font-display text-lg font-semibold text-paper">
                Recently added
              </h2>
              <Link href="/library" className={buttonClass("ghost", "sm")}>
                View all
                <ArrowRightIcon size={14} />
              </Link>
            </div>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
              {recentManga.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/library/${m.id}`}
                    className="group block aspect-[2/3] overflow-hidden rounded-xl border border-hairline bg-shelf transition-[border-color] duration-150 ease-snap hover:border-hairline-strong"
                  >
                    <CoverImage
                      src={m.coverUrl}
                      alt={m.title}
                      imgClassName="transition-transform duration-200 ease-snap motion-safe:fine:group-hover:scale-[1.03]"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            icon={<LibraryIcon size={20} />}
            title="Your library is empty"
            actions={
              <Link href="/search" className={buttonClass("primary", "md")}>
                Find manga
              </Link>
            }
          >
            <h2 id="recent-heading" className="sr-only">Recently added</h2>
            Search for something you&apos;ve read or want to read to get started.
          </EmptyState>
        )}
      </section>

      <section className={cn(CONTAINER, "pb-20")}>
        <div className={cn(PANEL, "flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-8")}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brass/30 bg-brass/10 text-brass">
            <SparklesIcon size={20} />
          </span>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold text-paper">Ready for something new?</h2>
            <p className="mt-1 text-sm text-slate">
              Pick a mood, anchor on favorites, and get five real picks with a reason for each.
            </p>
          </div>
          <Link href="/recommendations" className={buttonClass("primary", "md")}>
            Get recommendations
            <ArrowRightIcon size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}
