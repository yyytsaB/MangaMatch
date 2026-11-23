"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { CheckCircleIcon, FileIcon } from "@/components/Icons";
import { importLibrary, type ImportResult } from "@/lib/api-client";
import { LABEL, buttonClass, cn } from "@/lib/ui";

type Backup = { library: unknown[]; categories?: unknown[] };
type ImportMode = "merge" | "replace";

const MODES: { value: ImportMode; title: string; detail: string }[] = [
  { value: "merge", title: "Merge & update", detail: "Adds new titles and updates ones you already have." },
  { value: "replace", title: "Replace library", detail: "Deletes your current library first." },
];

export default function ImportLibraryModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (result: ImportResult) => void | Promise<void>;
}) {
  const [importing, setImporting] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!importing}
      title="Import a backup"
      description="Restore titles, ratings, reading status, and categories from a MangaMatch JSON export."
    >
      <ImportForm importing={importing} setImporting={setImporting} onCancel={onClose} onImported={onImported} />
    </Modal>
  );
}

function ImportForm({
  importing,
  setImporting,
  onCancel,
  onImported,
}: {
  importing: boolean;
  setImporting: (value: boolean) => void;
  onCancel: () => void;
  onImported: (result: ImportResult) => void | Promise<void>;
}) {
  const [backup, setBackup] = useState<Backup | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setBackup(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as Backup).library)) {
        throw new Error("This file isn’t a MangaMatch backup (no library list found).");
      }
      setBackup(parsed as Backup);
    } catch (err) {
      setError(err instanceof SyntaxError ? "This file isn’t valid JSON." : err instanceof Error ? err.message : "Couldn’t read that file.");
    }
  }

  async function handleImport() {
    if (!backup) return;
    setImporting(true);
    setError(null);
    try {
      const result = await importLibrary(backup, mode);
      await onImported(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const categoryCount = Array.isArray(backup?.categories) ? backup.categories.length : 0;

  return (
    <div className="space-y-5">
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-hairline-strong bg-ink px-4 py-6 text-center",
          "transition-[border-color] duration-150 ease-snap hover:border-brass/50",
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brass"
        )}
      >
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          disabled={importing}
          className="sr-only"
          aria-label="Choose backup file"
        />
        <FileIcon size={20} className="text-slate" />
        <span className="text-sm font-medium text-paper">{fileName ?? "Choose a .json backup"}</span>
        <span className="text-xs text-muted">Exported from MangaMatch</span>
      </label>

      {backup && (
        <p className="flex items-center gap-2 rounded-lg border border-completed/30 bg-completed/10 px-3 py-2 text-sm text-paper">
          <CheckCircleIcon className="shrink-0 text-completed" />
          <span>
            <span className="font-mono tabular-nums">{backup.library.length}</span> titles ·{" "}
            <span className="font-mono tabular-nums">{categoryCount}</span> categories ready to import
          </span>
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {backup && (
        <fieldset>
          <legend className={cn("mb-2", LABEL)}>Import mode</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODES.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "cursor-pointer rounded-lg border p-3 transition-[border-color,background-color] duration-150 ease-snap",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brass",
                  mode === option.value
                    ? option.value === "replace"
                      ? "border-danger/50 bg-danger/10"
                      : "border-brass/50 bg-brass/10"
                    : "border-hairline bg-ink hover:border-hairline-strong"
                )}
              >
                <input
                  type="radio"
                  name="import-mode"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                  className="sr-only"
                />
                <span className={cn("block text-sm font-medium", option.value === "replace" ? "text-danger" : "text-paper")}>
                  {option.title}
                </span>
                <span className="mt-0.5 block text-xs text-slate">{option.detail}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={importing} className={cn(buttonClass("secondary", "md"), "flex-1")}>
          Cancel
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={!backup || importing}
          className={cn(buttonClass(mode === "replace" ? "danger" : "primary", "md"), "flex-1")}
        >
          {importing ? "Importing…" : "Restore library"}
        </button>
      </div>
    </div>
  );
}
