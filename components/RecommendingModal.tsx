"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { SpinnerIcon } from "@/components/Icons";

// Rotates while a recommendation request is in flight, so a multi-second
// wait reads as progress instead of a frozen screen.
const STATUS_LABELS = [
  "Browsing the catalogue",
  "Cross-referencing your taste",
  "Weighing up the candidates",
  "Almost there",
];

const ROTATE_MS = 2200;

export default function RecommendingModal({ open }: { open: boolean }) {
  return (
    <Modal open={open} onClose={() => {}} dismissible={false} size="sm" title="Finding recommendations">
      {open && <RotatingStatus />}
    </Modal>
  );
}

function RotatingStatus() {
  const [labelIndex, setLabelIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLabelIndex((i) => (i + 1) % STATUS_LABELS.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <SpinnerIcon className="shrink-0 text-brass motion-safe:animate-spin" />
      <p key={labelIndex} className="text-sm text-slate animate-fade-in">
        {STATUS_LABELS[labelIndex]}…
      </p>
    </div>
  );
}
