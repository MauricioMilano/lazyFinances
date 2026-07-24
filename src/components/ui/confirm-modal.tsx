import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

// NOTE: This file is allowlisted in eslint-rules/no-raw-modal-primitives.cjs.
// It composes `Modal` (which itself imports the raw primitives) and never
// imports them directly. If you extract a third wrapper that needs the raw
// primitives, add it to the allowlist there.

type Intent = "primary" | "destructive";

type ConfirmModalProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: Intent;
  isLoading?: boolean;
  onConfirm?: () => void | Promise<void>;
};

const preventOutsideDismiss = (event: Event) => {
  event.preventDefault();
};

const ConfirmModal = ({
  open,
  defaultOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  intent = "primary",
  isLoading = false,
  onConfirm,
}: ConfirmModalProps) => {
  const cancelButtonRef = React.useRef<HTMLButtonElement>(null);
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const t = window.setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(t);
    }
    if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
    }
    return undefined;
  }, [open]);

  const handleConfirm = () => {
    if (isLoading) return;
    void onConfirm?.();
  };

  const confirmButton =
    intent === "destructive" ? (
      <Button
        variant="destructive"
        onClick={handleConfirm}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {confirmLabel}
      </Button>
    ) : (
      <Button onClick={handleConfirm} disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {confirmLabel}
      </Button>
    );

  const cancelButton = (
    <Button
      ref={cancelButtonRef}
      variant="outline"
      onClick={() => onOpenChange?.(false)}
      disabled={isLoading}
    >
      {cancelLabel}
    </Button>
  );

  return (
    <Modal
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      onPointerDownOutside={preventOutsideDismiss}
      onInteractOutside={preventOutsideDismiss}
    >
      <Modal.Header title={title} description={description} />
      <Modal.Footer>
        {cancelButton}
        {confirmButton}
      </Modal.Footer>
    </Modal>
  );
};

export { ConfirmModal };
export type { ConfirmModalProps };
