"use client";

import EmptyState from "@/components/EmptyState";
import ErrorBanner from "@/components/ErrorBanner";
import { FiltersIcon, RefreshIcon, ShuffleIcon, SparklesIcon } from "@/components/Icons";
import RecommendationCard from "@/components/recommendations/RecommendationCard";
import type { Recommendation, SavedManga } from "@/lib/types";
import { buttonClass, cn } from "@/lib/ui";

export default function RecommendationResults({
  recommendations,
  anchors,
  addedIds,
  note,
  error,
  loading,
  onAdjust,
  onMore,
  onDiverge,
  onSave,
  onAlreadyRead,
  onNotInterested,
}: {
  recommendations: Recommendation[];
  anchors: SavedManga[];
  addedIds: Set<number>;
  note: string | null;
  error: string | null;
  loading: boolean;
  onAdjust: () => void;
  onMore: () => void;
  onDiverge: () => void;
  onSave: (rec: Recommendation) => void;
  onAlreadyRead: (rec: Recommendation) => void;
  onNotInterested: (rec: Recommendation) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-shelf p-3 sm:flex-row sm:items-center sm:justify-between sm:pl-4">
        <div className="min-w-0 text-sm text-slate">
          <p aria-live="polite">
            <span className="font-mono text-paper tabular-nums">{recommendations.length}</span>{" "}
            {recommendations.length === 1 ? "pick" : "picks"} for you
          </p>
          {anchors.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-muted">
              Anchored on {anchors.map((m) => m.title).join(", ")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onAdjust} className={buttonClass("ghost", "sm")}>
            <FiltersIcon size={14} />
            Adjust
          </button>
          <button type="button" onClick={onMore} disabled={loading} className={buttonClass("secondary", "sm")}>
            <RefreshIcon size={14} />
            Suggest more
          </button>
          <button type="button" onClick={onDiverge} disabled={loading} className={buttonClass("secondary", "sm")}>
            <ShuffleIcon size={14} />
            Something different
          </button>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {recommendations.length > 0 ? (
        <ul className={cn("grid gap-4 lg:grid-cols-2")}>
          {recommendations.map((rec) => (
            <li key={rec.anilistId}>
              <RecommendationCard
                rec={rec}
                isAdded={addedIds.has(rec.anilistId)}
                onSave={onSave}
                onAlreadyRead={onAlreadyRead}
                onNotInterested={onNotInterested}
              />
            </li>
          ))}
        </ul>
      ) : (
        !error && (
          <EmptyState
            icon={<SparklesIcon size={20} />}
            title="No more picks for now"
            actions={
              <button type="button" onClick={onAdjust} className={buttonClass("primary", "md")}>
                Adjust preferences
              </button>
            }
          >
            {note ?? "Nothing new matched these preferences. Try loosening them or asking for something different."}
          </EmptyState>
        )
      )}
    </div>
  );
}
