"use client";

import { useId, useRef, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { useDialog } from "@/lib/use-dialog";
import { Icon } from "./Icon";

export interface BottomSheetProps {
  open: boolean;
  onClose?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** true: positioned inside the relative parent (e.g. a preview frame); false (default): full screen. */
  contained?: boolean;
  children?: ReactNode;
}

/**
 * Modal drawer that slides up from the bottom (mobile). From 1024px the same dialog is a
 * centred 480px window (SPEC B2). Focus trap, Escape, scrim tap, focus return; 280ms
 * animation, cut under prefers-reduced-motion.
 */
export function BottomSheet({ open, onClose, title, subtitle, contained = false, children }: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(open, ref, onClose, { lockScroll: !contained });

  return (
    <div
      className={cx(
        contained ? "absolute" : "fixed",
        "inset-0 z-50",
        open ? "visible" : "pointer-events-none invisible transition-[visibility] delay-280 duration-0",
      )}
      aria-hidden={open ? undefined : true}
      inert={!open}
      data-state={open ? "open" : "closed"}
    >
      <div
        className={cx("absolute inset-0 bg-scrim transition-opacity duration-240 ease-out", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
        data-testid="sheet-scrim"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          "absolute inset-x-0 bottom-0 mx-auto max-h-[92%] max-w-120 overflow-y-auto overscroll-contain bg-surface-raised px-5 pt-2 pb-[calc(var(--space-5)+env(safe-area-inset-bottom,0px))] shadow-sheet outline-none",
          "rounded-t-sheet transition-[translate,opacity,scale] duration-280 ease-sc",
          "lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:max-h-[90vh] lg:w-120 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-sheet lg:pt-5",
          open ? "translate-y-0 lg:scale-100 lg:opacity-100" : "translate-y-full lg:scale-95 lg:opacity-0",
        )}
      >
        <div className="mx-auto mb-3 h-[5px] w-11 rounded-pill bg-line-strong lg:hidden" aria-hidden="true" />
        <div className="mb-4 flex items-start gap-3">
          <h2 id={titleId} className="m-0 flex-1 text-sheet-title">
            {title}
            {subtitle ? <span className="mt-1 block font-sans text-sm leading-5 font-semibold text-ink-muted">{subtitle}</span> : null}
          </h2>
          <button
            type="button"
            data-dialog-close
            aria-label="Fermer"
            onClick={onClose}
            className="relative inline-grid size-11 flex-none cursor-pointer place-items-center rounded-md text-ink hover:bg-surface-sunken"
          >
            <Icon name="x" size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
