"use client";

import { createContext, useContext } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";

export interface CheckoutContextValue {
  /** false outside a pack page (no checkout mounted): CTAs then link to their fallback href. */
  available: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const noop = () => {};
/** Opening a pack page with this hash opens its checkout directly (/packs/<slug>#commander). */
export const CHECKOUT_HASH = "#commander";
export const CheckoutContext = createContext<CheckoutContextValue>({ available: false, isOpen: false, open: noop, close: noop });

export function useCheckout(): CheckoutContextValue {
  return useContext(CheckoutContext);
}

export interface CheckoutCtaProps extends Omit<ButtonProps, "onClick" | "href"> {
  /** Marks the CTA watched by the StickyCta (the ProductCard CTA). */
  stickyAnchor?: boolean;
  /** Link used when no checkout is mounted (default: the home catalogue). */
  fallbackHref?: string;
}

/** Any CTA of a pack page: they all open that pack's checkout. */
export function CheckoutCta({ stickyAnchor, fallbackHref = "/", ...props }: CheckoutCtaProps) {
  const { open, available } = useCheckout();
  if (!available) return <Button {...props} href={fallbackHref} />;
  return <Button {...props} onClick={open} data-sticky-anchor={stickyAnchor ? "" : undefined} aria-haspopup="dialog" />;
}
