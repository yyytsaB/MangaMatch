import { Suspense } from "react";
import PageHeader from "@/components/PageHeader";
import RecommendationsView from "@/components/recommendations/RecommendationsView";
import { CONTAINER, cn } from "@/lib/ui";

export default function RecommendationsPage() {
  return (
    // RecommendationsView reads ?similarTo= (useSearchParams).
    <Suspense
      fallback={
        <div className={cn(CONTAINER, "py-8")}>
          <PageHeader eyebrow="Recommendations" title="Find your next read" />
        </div>
      }
    >
      <RecommendationsView />
    </Suspense>
  );
}
