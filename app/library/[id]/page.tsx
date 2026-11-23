import Link from "next/link";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import CategoryManager from "@/components/CategoryManager";
import ReadingStatusEditor from "@/components/ReadingStatusEditor";
import DeleteMangaButton from "@/components/DeleteMangaButton";
import RatingEditor from "@/components/RatingEditor";
import CoverImage from "@/components/CoverImage";
import Chip from "@/components/Chip";
import StatusBadge from "@/components/StatusBadge";
import BackToLibraryLink from "@/components/library/BackToLibraryLink";
import { ExternalLinkIcon, SparklesIcon, StarIcon } from "@/components/Icons";
import { parseList } from "@/lib/manga";
import { readerUrl } from "@/lib/reader-links";
import { getSessionId } from "@/lib/session";
import { CONTAINER, LABEL, PANEL, buttonClass, cn } from "@/lib/ui";
import { parseId } from "@/lib/validation";

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function titleCase(value: string | null): string | null {
  if (!value) return null;
  const lower = value.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default async function MangaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mangaId = parseId(id);
  if (!mangaId) notFound();

  const sessionId = await getSessionId();
  const manga = await prisma.manga.findUnique({
    where: { id: mangaId, sessionId },
    include: { categories: { where: { sessionId } } },
  });

  if (!manga) notFound();

  const genres = parseList(manga.genres);
  const authors = parseList(manga.authors);
  const from = formatDate(manga.publishedFrom);
  const to = formatDate(manga.publishedTo);
  const ongoing = ["RELEASING", "HIATUS"].includes((manga.publicationStatus ?? "").toUpperCase());

  const metadata = [
    { label: "Author", value: authors.length > 0 ? authors.join(", ") : null },
    { label: "Publication", value: titleCase(manga.publicationStatus) },
    { label: "Published", value: from ? (to ? `${from} – ${to}` : ongoing ? `${from} – present` : from) : null },
    { label: "Chapters", value: manga.chapters ? String(manga.chapters) : null, mono: true },
    { label: "Volumes", value: manga.volumes ? String(manga.volumes) : null, mono: true },
    { label: "Community score", value: manga.malScore ? `${manga.malScore}/10` : null, mono: true, star: true },
  ];

  return (
    <div className={cn(CONTAINER, "py-6 sm:py-8")}>
      <div className="mb-6">
        <BackToLibraryLink />
      </div>

      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-xl border border-hairline bg-shelf lg:max-w-none">
            <div className="aspect-[2/3] w-full">
              <CoverImage src={manga.coverUrl} alt={`${manga.title} cover`} priority />
            </div>
          </div>

          <div className={cn(PANEL, "p-4")}>
            <p className={cn("mb-2.5", LABEL)}>Read online</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={readerUrl("mangafire", manga.title)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonClass("secondary", "sm"), "w-full")}
              >
                MangaFire
                <ExternalLinkIcon size={12} />
              </a>
              <a
                href={readerUrl("comix", manga.title)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonClass("secondary", "sm"), "w-full")}
              >
                Comix
                <ExternalLinkIcon size={12} />
              </a>
            </div>
            {manga.siteUrl && (
              <a
                href={manga.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonClass("ghost", "sm"), "mt-2 w-full")}
              >
                Series details
                <ExternalLinkIcon size={12} />
              </a>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <header>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={manga.readingStatus} />
              {genres.map((genre) => (
                <Chip key={genre}>{genre}</Chip>
              ))}
            </div>
            <h1 className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] text-paper sm:text-[2.25rem]">
              {manga.title}
            </h1>
            <Link href={`/recommendations?similarTo=${manga.id}`} className={cn(buttonClass("primary", "md"), "mt-4")}>
              <SparklesIcon />
              Find similar
            </Link>
          </header>

          <section aria-label="Your progress" className={cn(PANEL, "grid gap-6 p-5 md:grid-cols-2")}>
            <ReadingStatusEditor mangaId={manga.id} currentStatus={manga.readingStatus} />
            <RatingEditor mangaId={manga.id} currentRating={manga.rating} />
          </section>

          <dl className={cn(PANEL, "grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3")}>
            {metadata.map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className={LABEL}>{item.label}</dt>
                <dd
                  className={cn(
                    "mt-1 flex items-start gap-1.5 text-sm",
                    item.value ? "text-paper" : "text-muted",
                    item.mono && item.value && "font-mono tabular-nums"
                  )}
                >
                  {item.star && item.value && <StarIcon size={12} fill="currentColor" strokeWidth={0} className="mt-1 shrink-0 text-brass" />}
                  <span className="min-w-0 break-words">{item.value ?? "Unknown"}</span>
                </dd>
              </div>
            ))}
          </dl>

          <section className={cn(PANEL, "p-5")}>
            <h2 className={cn("mb-2.5", LABEL)}>Synopsis</h2>
            <p className="max-w-[65ch] text-sm leading-relaxed whitespace-pre-line text-slate">
              {manga.synopsis ?? "No synopsis available."}
            </p>
          </section>

          <section className={cn(PANEL, "p-5")}>
            <CategoryManager mangaId={manga.id} assigned={manga.categories} />
          </section>

          <div className="border-t border-hairline pt-6">
            <DeleteMangaButton mangaId={manga.id} title={manga.title} />
          </div>
        </div>
      </div>
    </div>
  );
}
