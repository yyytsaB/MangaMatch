"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertIcon, CheckCircleIcon, InfoIcon, XIcon } from "@/components/Icons";
import { ICON_BUTTON, cn } from "@/lib/ui";

export type ToastType = "success" | "error" | "info";
export interface ToastAction {
  label: string;
  onClick: () => void;
}
export interface ToastMessage {
  text: string;
  type: ToastType;
  action?: ToastAction;
}

/** One transient notification per page: `[toast, showToast, clearToast]`. */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const showToast = useCallback(
    (text: string, type: ToastType = "success", action?: ToastAction) => setToast({ text, type, action }),
    []
  );
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
  // Pause state belongs to one toast; a replaced or closed toast can't leave
  // the next one stuck open.
  const [hoveredToast, setHoveredToast] = useState<ToastMessage | null>(null);
  const [focusedToast, setFocusedToast] = useState<ToastMessage | null>(null);
  const paused = toast !== null && (hoveredToast === toast || focusedToast === toast);

  useEffect(() => {
    // Hold while the reader is pointing at or focused inside the toast, so
    // an action such as Undo stays reachable; restart the full time after.
    if (!toast || paused) return;
    const timer = setTimeout(onClose, toast.action ? Math.max(durationMs, 6000) : durationMs);
    return () => clearTimeout(timer);
  }, [toast, onClose, durationMs, paused]);

  return (
    <div
      role={toast?.type === "error" ? "alert" : "status"}
      aria-live={toast?.type === "error" ? "assertive" : "polite"}
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      {toast && (
        <div
          key={toast.text}
          onMouseEnter={() => setHoveredToast(toast)}
          onMouseLeave={() => setHoveredToast(null)}
          onFocus={() => setFocusedToast(toast)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedToast(null);
          }}
          className={cn(
            "pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-hairline bg-elevated py-2.5 pr-2 pl-4 shadow-overlay animate-enter"
          )}
        >
          <span className="shrink-0">{ICONS[toast.type]}</span>
          <p className="text-sm text-paper">{toast.text}</p>
          {toast.action && (
            <button
              type="button"
              onClick={toast.action.onClick}
              className="shrink-0 rounded-full px-2.5 py-1 text-sm font-medium text-brass transition-[background-color] duration-150 ease-snap hover:bg-brass/10"
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" onClick={onClose} className={cn(ICON_BUTTON, "h-8 w-8")} aria-label="Dismiss notification">
            <XIcon />
          </button>
        </div>
      )}
    </div>
  );
}
