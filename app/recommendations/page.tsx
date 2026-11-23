"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import ErrorBanner from "@/components/ErrorBanner";
import Modal from "@/components/Modal";
import Toast, { useToast } from "@/components/Toast";
import RecommendingModal from "@/components/RecommendingModal";
import StepIndicator, { type WizardStep } from "@/components/recommendations/StepIndicator";
import FilterStep, { type RecommendationFilters } from "@/components/recommendations/FilterStep";
import BaseMangaStep from "@/components/recommendations/BaseMangaStep";
import RecommendationResults from "@/components/recommendations/RecommendationResults";
import { addMangaToLibrary, fetchLibrary } from "@/lib/api-client";
import { fetchJson, jsonRequest } from "@/lib/http";
import { isGenre } from "@/lib/genres";
import { parseList, toggleSetItem } from "@/lib/manga";
import type { Recommendation, SavedManga } from "@/lib/types";
import { MAX_EXCLUDED_ANILIST_IDS } from "@/lib/validation";
import { CONTAINER, buttonClass, cn } from "@/lib/ui";

export default function RecommendationsPage() {
  const [library, setLibrary] = useState<SavedManga[]>([]);
  const [step, setStep] = useState<WizardStep>("filters");

  const [filters, setFilters] = useState<RecommendationFilters>({
    genres: new Set(),
    completionStatus: "any",
    chapterLength: "any",
    contentRating: "any",
    customQuery: "",
  });
  const [baseMangaIds, setBaseMangaIds] = useState<Set<number>>(new Set());

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [seenIds, setSeenIds] = useState<number[]>([]);
  const [poolPage, setPoolPage] = useState(1);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingRec, setConfirmingRec] = useState<Recommendation | null>(null);
  const [addingToLibrary, setAddingToLibrary] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [toast, showToast, clearToast] = useToast();

  useEffect(() => {
    fetchLibrary()
      .then(setLibrary)
      .catch(() => setLibrary([]));
  }, []);

  const selectedLibraryGenres = Array.from(filters.genres).filter(isGenre);
  const baseCandidates =
    selectedLibraryGenres.length === 0
      ? library
      : library.filter((m) => parseList(m.genres).some((g) => selectedLibraryGenres.includes(g)));
  const anchors = library.filter((m) => baseMangaIds.has(m.id));

  async function fetchRecommendations(diverge = false, fresh = false) {
    setLoading(true);
    setError(null);
    setNote(null);

    const excludeAnilistIds = fresh ? [] : seenIds;
    const page = fresh ? 1 : poolPage + 1;

    try {
      const data = await fetchJson<{ recommendations: Recommendation[]; note?: string | null }>(
        "/api/recommend",
        jsonRequest("POST", {
          genres: Array.from(filters.genres),
          completionStatus: filters.completionStatus,
          chapterLength: filters.chapterLength,
          contentRating: filters.contentRating,
          baseMangaIds: Array.from(baseMangaIds),
          diverge,
          customQuery: filters.customQuery,
          excludeAnilistIds,
          page,
        })
      );

      const batch = data.recommendations ?? [];
      setRecommendations(batch);
      setNote(data.note ?? null);
      setPoolPage(page);
      setSeenIds((previous) =>
        Array.from(new Set([...(fresh ? [] : previous), ...batch.map((rec) => rec.anilistId)])).slice(
          -MAX_EXCLUDED_ANILIST_IDS
        )
      );
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(rec: Recommendation) {
    try {
      await addMangaToLibrary(rec);
      setAddedIds((prev) => new Set(prev).add(rec.anilistId));
      showToast(`Added “${rec.title}” to your library`, "success");
    } catch {
      showToast("Couldn’t save that one. Try again.", "error");
    }
  }

  function dismissRecommendation(anilistId: number) {
    setRecommendations((prev) => prev.filter((rec) => rec.anilistId !== anilistId));
  }

  async function confirmAddAsCompleted() {
    if (!confirmingRec) return;
    setAddingToLibrary(true);

    try {
      await addMangaToLibrary(confirmingRec, "completed");
      dismissRecommendation(confirmingRec.anilistId);
      showToast(`Saved “${confirmingRec.title}” as completed`, "success");
    } catch {
      showToast("Couldn’t save that one. Try again.", "error");
    } finally {
      setAddingToLibrary(false);
      setConfirmingRec(null);
    }
  }

  function justDismiss() {
    if (!confirmingRec) return;
    dismissRecommendation(confirmingRec.anilistId);
    setConfirmingRec(null);
  }

  return (
    <div className={cn(CONTAINER, "py-8")}>
      <PageHeader
        eyebrow="Recommendations"
        title="Find your next read"
        description="Tell us what you're in the mood for. Every pick is a real, published manga, ranked against your taste."
      />

      <StepIndicator step={step} canViewResults={recommendations.length > 0 || note !== null} onSelect={setStep} />

      {error && step !== "results" && <ErrorBanner className="mb-4">{error}</ErrorBanner>}

      <div key={step} className="animate-enter">
        {step === "filters" && (
          <FilterStep
            filters={filters}
            loading={loading}
            onToggleGenre={(genre) => setFilters((prev) => ({ ...prev, genres: toggleSetItem(prev.genres, genre) }))}
            onClearGenres={() => setFilters((prev) => ({ ...prev, genres: new Set() }))}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onNext={() => setStep("base")}
            onSkip={() => fetchRecommendations(false, true)}
          />
        )}

        {step === "base" && (
          <BaseMangaStep
            candidates={baseCandidates}
            libraryIsEmpty={library.length === 0}
            selectedIds={baseMangaIds}
            loading={loading}
            onToggle={(id) => setBaseMangaIds((prev) => toggleSetItem(prev, id))}
            onBack={() => setStep("filters")}
            onSubmit={() => fetchRecommendations(false, true)}
          />
        )}

        {step === "results" && (
          <RecommendationResults
            recommendations={recommendations}
            anchors={anchors}
            addedIds={addedIds}
            note={note}
            error={error}
            loading={loading}
            onAdjust={() => setStep("filters")}
            onMore={() => fetchRecommendations(false)}
            onDiverge={() => fetchRecommendations(true)}
            onSave={handleSave}
            onAlreadyRead={setConfirmingRec}
          />
        )}
      </div>

      <RecommendingModal open={loading} />

      <Modal
        open={confirmingRec !== null}
        onClose={() => setConfirmingRec(null)}
        dismissible={!addingToLibrary}
        size="sm"
        title="Already read this one?"
        description={
          confirmingRec ? `Save “${confirmingRec.title}” to your library as Completed, or just hide it from these picks.` : undefined
        }
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={justDismiss}
            disabled={addingToLibrary}
            className={cn(buttonClass("secondary", "md"), "flex-1")}
          >
            Just dismiss
          </button>
          <button
            type="button"
            onClick={confirmAddAsCompleted}
            disabled={addingToLibrary}
            className={cn(buttonClass("primary", "md"), "flex-1")}
          >
            {addingToLibrary ? "Saving…" : "Yes, add as completed"}
          </button>
        </div>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
