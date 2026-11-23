"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/ui";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs in mount order; only the topmost one reacts to Escape/Tab so a
// confirmation stacked over another dialog never closes both.
const openStack: symbol[] = [];

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Leading icon beside the title (e.g. on confirmations). */
  icon?: ReactNode;
  /** False while work is in flight that must not be interrupted. */
  dismissible?: boolean;
  /** `sheet` slides in from the left edge (mobile filter drawer). */
  variant?: "dialog" | "sheet";
  /** Pinned below the scrolling content (e.g. a sheet's apply button). */
  footer?: ReactNode;
  /**
   * `content` focuses the first control; `dialog` focuses the dialog itself
   * (avoids popping the on-screen keyboard when a sheet opens on a phone).
   */
  initialFocus?: "content" | "dialog";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };

export default function Modal(props: ModalProps) {
  if (!props.open || typeof document === "undefined") return null;
  return createPortal(<ModalSurface {...props} />, document.body);
}

function ModalSurface({
  onClose,
  title,
  description,
  children,
  icon,
  dismissible = true,
  variant = "dialog",
  footer,
  initialFocus = "content",
  size = "md",
  className,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pressStartedOnBackdrop = useRef(false);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  const initialFocusRef = useRef(initialFocus);

  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    const token = Symbol("modal");
    openStack.push(token);
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initial =
      initialFocusRef.current === "dialog"
        ? panelRef.current
        : (panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
          contentRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
          panelRef.current);
    initial?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      const panel = panelRef.current;
      if (openStack[openStack.length - 1] !== token || !panel) return;

      if (event.key === "Escape") {
        if (dismissibleRef.current) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }
      if (event.key !== "Tab") return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const outside = !panel.contains(active);
      if (event.shiftKey && (active === first || active === panel || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openStack.splice(openStack.indexOf(token), 1);
      document.body.style.overflow = overflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  const sheet = variant === "sheet";

  return (
    <div
      data-testid="modal-backdrop"
      className={cn(
        "fixed inset-0 z-50 flex bg-ink/70 backdrop-blur-md animate-fade-in",
        sheet ? "items-stretch justify-start" : "items-center justify-center p-4"
      )}
      onMouseDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressStartedOnBackdrop.current && dismissibleRef.current) {
          onCloseRef.current();
        }
        pressStartedOnBackdrop.current = false;
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex flex-col border border-hairline bg-elevated shadow-overlay focus-visible:outline-none",
          sheet
            ? "h-full w-[min(22rem,88vw)] overflow-hidden rounded-r-2xl border-l-0 animate-sheet-in"
            : cn("max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl p-6 animate-dialog-in", SIZES[size]),
          className
        )}
      >
        <div className={cn("flex items-start gap-3", sheet ? "shrink-0 px-5 pt-5 pb-4" : "mb-4")}>
          {icon}
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-lg font-semibold leading-tight text-paper">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-slate">
                {description}
              </p>
            )}
          </div>
        </div>
        <div ref={contentRef} className={cn(sheet && "scroll-quiet min-h-0 flex-1 overflow-y-auto px-5 pb-5")}>
          {children}
        </div>
        {footer && (
          <div className={cn(sheet ? "shrink-0 border-t border-hairline p-4" : "mt-6")}>{footer}</div>
        )}
      </div>
    </div>
  );
}
