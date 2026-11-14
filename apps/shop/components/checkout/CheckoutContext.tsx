"use client";

import { createContext, useContext } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";

export interface CheckoutContextValue {
  /** false outside the landing (no checkout mounted): CTAs then link to /#commander. */
  available: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const noop = () => {};
/** Opening the landing with this hash opens the checkout directly. */
export const CHECKOUT_HASH = "#commander";
export const CHECKOUT_HREF = `/${CHECKOUT_HASH}`;
export const CheckoutContext = createContext<CheckoutContextValue>({ available: false, isOpen: false, open: noop, close: noop });

export function useCheckout(): CheckoutContextValue {
  return useContext(CheckoutContext);
}

export interface CheckoutCtaProps extends Omit<ButtonProps, "onClick" | "href"> {
  /** Marks the CTA watched by the StickyCta (the ProductCard CTA). */
  stickyAnchor?: boolean;
}

/** Any CTA of the landing: they all open the same checkout. */
export function CheckoutCta({ stickyAnchor, ...props }: CheckoutCtaProps) {
  const { open, available } = useCheckout();
  if (!available) return <Button {...props} href={CHECKOUT_HREF} />;
  return <Button {...props} onClick={open} data-sticky-anchor={stickyAnchor ? "" : undefined} aria-haspopup="dialog" />;
}
