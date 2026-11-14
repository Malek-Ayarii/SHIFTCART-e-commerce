"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
}

interface Options {
  /** Selector of the element to focus on open (default: first field, else first focusable). */
  initialFocus?: string;
  /** Locks page scroll while open. */
  lockScroll?: boolean;
}

/**
 * Modal behaviour shared by BottomSheet and the menu overlay: initial focus, Tab trapped,
 * Escape closes, focus returned to the opener, page scroll locked.
 */
export function useDialog(open: boolean, ref: RefObject<HTMLElement | null>, onClose: (() => void) | undefined, opts: Options = {}) {
  const { initialFocus = 'input:not([tabindex="-1"]), select, textarea', lockScroll = true } = opts;
  const close = useEffectEvent(() => onClose?.());

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const root = ref.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(initialFocus) ?? focusableIn(root).find((el) => !el.hasAttribute("data-dialog-close")) ?? root;
      target.focus({ preventScroll: true });
    }, 60);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      const root = ref.current;
      if (e.key !== "Tab" || !root) return;
      const items = focusableIn(root);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      if (lockScroll) document.body.style.overflow = prevOverflow;
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open, ref, initialFocus, lockScroll]);
}
