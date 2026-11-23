"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertIcon, CheckCircleIcon, InfoIcon, XIcon } from "@/components/Icons";
import { ICON_BUTTON, cn } from "@/lib/ui";

export type ToastType = "success" | "error" | "info";
export interface ToastMessage {
  text: string;
  type: ToastType;
}

/** One transient notification per page: `[toast, showToast, clearToast]`. */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const showToast = useCallback((text: string, type: ToastType = "success") => setToast({ text, type }), []);
  const clearToast = useCallback(() => setToast(null), []);
  return [toast, showToast, clearToast] as const;
}

const ICONS = {
  success: <CheckCircleIcon className="text-completed" />,
  error: <AlertIcon className="text-danger" />,
  info: <InfoIcon className="text-brass" />,
};

export default function Toast({
  toast,
  onClose,
  durationMs = 3500,
}: {
  toast: ToastMessage | null;
  onClose: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [toast, onClose, durationMs]);

  return (
    <div
      role={toast?.type === "error" ? "alert" : "status"}
      aria-live={toast?.type === "error" ? "assertive" : "polite"}
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      {toast && (
        <div
          key={toast.text}
          className={cn(
            "pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-hairline bg-elevated py-2.5 pr-2 pl-4 shadow-overlay animate-enter"
          )}
        >
          <span className="shrink-0">{ICONS[toast.type]}</span>
          <p className="text-sm text-paper">{toast.text}</p>
          <button type="button" onClick={onClose} className={cn(ICON_BUTTON, "h-8 w-8")} aria-label="Dismiss notification">
            <XIcon />
          </button>
        </div>
      )}
    </div>
  );
}
