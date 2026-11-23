"use client";

import Modal from "@/components/Modal";
import { AlertIcon, InfoIcon } from "@/components/Icons";
import { buttonClass, cn } from "@/lib/ui";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={isOpen}
      onClose={onCancel}
      dismissible={!busy}
      size="sm"
      title={title}
      description={message}
      icon={
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
            isDestructive ? "border-danger/30 bg-danger/10 text-danger" : "border-brass/30 bg-brass/10 text-brass"
          )}
        >
          {isDestructive ? <AlertIcon /> : <InfoIcon />}
        </span>
      }
    >
      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} disabled={busy} className={buttonClass("secondary", "sm")}>
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={buttonClass(isDestructive ? "danger" : "primary", "sm")}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
