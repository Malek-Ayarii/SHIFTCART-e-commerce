"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CHECKOUT_HREF, useCheckout } from "@/components/checkout/CheckoutContext";
import { Navbar } from "@/components/ui/Navbar";
import { cx } from "@/lib/cx";
import { MenuOverlay } from "./MenuOverlay";

export interface SiteHeaderProps {
  /** Cart badge (1 on the landing: the pack is the cart). */
  count?: number;
  contactHref: string;
  showReviews?: boolean;
  className?: string;
}

/** Mobile navbar + its full-screen menu. The cart opens the checkout (or goes to /#commander elsewhere). */
export function SiteHeader({ count, contactHref, showReviews, className }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const checkout = useCheckout();
  const router = useRouter();
  const order = () => (checkout.available ? checkout.open() : router.push(CHECKOUT_HREF));

  return (
    <>
      <Navbar
        className={cx(className)}
        count={count}
        onMenu={() => setMenuOpen(true)}
        onCart={order}
        menuExpanded={menuOpen}
        menuControls="sc-menu"
      />
      <MenuOverlay
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOrder={order}
        contactHref={contactHref}
        showReviews={showReviews}
      />
    </>
  );
}
