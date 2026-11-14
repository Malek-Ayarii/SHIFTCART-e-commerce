"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { submitOrder } from "@/app/actions/submit-order";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CheckoutForm, type CheckoutSubmission } from "@/components/ui/CheckoutForm";
import { StickyCta } from "@/components/ui/StickyCta";
import { initAnalytics, track } from "@/lib/analytics";
import { PRODUCT } from "@/lib/product";
import type { OrderSource } from "@/lib/types";
import { CHECKOUT_HASH, CheckoutContext } from "./CheckoutContext";

const UTM_KEY = "sc_utm";

/** Reads utm_* from the landing URL (kept for the session so an in-page navigation keeps them). */
function captureSource(): OrderSource | undefined {
  try {
    const q = new URLSearchParams(window.location.search);
    const fromUrl: OrderSource = {
      utmSource: q.get("utm_source") ?? undefined,
      utmCampaign: q.get("utm_campaign") ?? undefined,
      utmContent: q.get("utm_content") ?? undefined,
    };
    if (Object.values(fromUrl).some(Boolean)) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = sessionStorage.getItem(UTM_KEY);
    return stored ? (JSON.parse(stored) as OrderSource) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Client island of the landing: owns the checkout dialog (bottom sheet on mobile, centred
 * modal on desktop), the StickyCta and the analytics events. Everything else stays static.
 */
export function CheckoutRoot({ children, sticky = true }: { children: ReactNode; sticky?: boolean }) {
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const [anchorVisible, setAnchorVisible] = useState(true);
  const source = useRef<OrderSource | undefined>(undefined);

  useEffect(() => {
    source.current = captureSource();
    initAnalytics();
    track("ViewContent", { content_ids: PRODUCT.sku, content_type: "product", value: PRODUCT.priceTnd, currency: PRODUCT.currency });
  }, []);

  // StickyCta: shown once the [data-sticky-anchor] zone (hero + ProductCard, mobile only) has
  // left the screen. Observing a tall zone rather than the button itself means a fast fling
  // that jumps over the button still flips the intersection state.
  useEffect(() => {
    if (!sticky) return;
    const anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-sticky-anchor]"));
    if (anchors.length === 0 || typeof IntersectionObserver === "undefined") return;
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target, e.isIntersecting);
      setAnchorVisible(Array.from(seen.values()).some(Boolean));
    });
    anchors.forEach((a) => io.observe(a));
    return () => io.disconnect();
  }, [sticky]);

  const open = useCallback(() => {
    setOpen(true);
    track("InitiateCheckout", { content_ids: PRODUCT.sku, value: PRODUCT.priceTnd, currency: PRODUCT.currency, num_items: 1 });
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const ctx = useMemo(() => ({ available: true, isOpen, open, close }), [isOpen, open, close]);

  // /#commander (cart icon from another page) opens the checkout right away.
  useEffect(() => {
    function fromHash() {
      if (window.location.hash === CHECKOUT_HASH) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
        open();
      }
    }
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [open]);

  const onSubmit = useCallback((order: CheckoutSubmission) => submitOrder({ ...order, source: source.current }), []);
  const onSuccess = useCallback(
    (ref: string) => {
      track("Lead", { content_ids: PRODUCT.sku, value: PRODUCT.priceTnd, currency: PRODUCT.currency });
      router.push(`/merci/${encodeURIComponent(ref)}`);
    },
    [router],
  );

  return (
    <CheckoutContext.Provider value={ctx}>
      {children}
      {sticky ? <StickyCta className="lg:hidden" visible={!anchorVisible && !isOpen} price={PRODUCT.priceTnd} onClick={open} /> : null}
      <BottomSheet open={isOpen} onClose={close} title="Finalise ta commande" subtitle="Tu paies à la livraison">
        <CheckoutForm price={PRODUCT.priceTnd} productName={PRODUCT.name} onSubmit={onSubmit} onSuccess={onSuccess} />
      </BottomSheet>
    </CheckoutContext.Provider>
  );
}
