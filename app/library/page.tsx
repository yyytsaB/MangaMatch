import { Suspense } from "react";
import MangaCardSkeletons from "@/components/MangaCardSkeletons";
import LibraryView from "@/components/library/LibraryView";
import { CONTAINER, cn } from "@/lib/ui";

export default function LibraryPage() {
  return (
    // LibraryView reads its filters from the URL (useSearchParams).
    <Suspense
      fallback={
        <div className={cn(CONTAINER, "py-8")}>
          <div className="mb-6 h-[92px] border-b border-hairline" />
          <MangaCardSkeletons count={10} />
        </div>
      }
    >
      <LibraryView />
    </Suspense>
  );
}
