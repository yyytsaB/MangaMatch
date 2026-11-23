"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import { TrashIcon } from "@/components/Icons";
import { deleteManga } from "@/lib/api-client";
import { buttonClass } from "@/lib/ui";

export default function DeleteMangaButton({ mangaId, title }: { mangaId: number; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteManga(mangaId);
      router.push("/library");
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirming(false);
      setError("Couldn’t remove this manga. Try again.");
    }
  }

  return (
    <>
      <button type="button" onClick={() => setConfirming(true)} className={buttonClass("danger", "sm")}>
        <TrashIcon />
        Remove from library
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <ConfirmModal
        isOpen={confirming}
        busy={deleting}
        title="Remove from library?"
        message={`“${title}” will be removed along with your rating and status.`}
        confirmLabel={deleting ? "Removing…" : "Remove"}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
