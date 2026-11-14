"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { submitOrder } from "@/app/actions/submit-order";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CheckoutForm, type CheckoutSubmission } from "@/components/ui/CheckoutForm";
import { StickyCta } from "@/components/ui/StickyCta";
import { initAnalytics, track } from "@/lib/analytics";
import type { OrderSource } from "@/lib/types";
import { captureSource } from "@/lib/utm";
import { CHECKOUT_HASH, CheckoutContext } from "./CheckoutContext";

const CURRENCY = "TND";

/** The pack this checkout sells (docs/SPEC-V2.md › Checkout pour le pack affiché). */
export interface CheckoutProduct {
  sku: string;
  name: string;
  priceTnd: number;
  image?: { src: string; alt: string; position?: string } | null;
}

/**
 * Client island of a pack page: owns the checkout dialog (bottom sheet on mobile, centred
 * modal on desktop) for that pack, the StickyCta and the analytics events.
 */
export function CheckoutRoot({ children, product, sticky = true }: { children: ReactNode; product: CheckoutProduct; sticky?: boolean }) {
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const [anchorVisible, setAnchorVisible] = useState(true);
  const source = useRef<OrderSource | undefined>(undefined);
  // Bumped after a successful order so the form remounts empty (see the effect below).
  const [formKey, setFormKey] = useState(0);
  const ordered = useRef(false);
  const { sku, name, priceTnd } = product;

  useEffect(() => {
    source.current = captureSource();
    initAnalytics();
    track("ViewContent", { content_ids: sku, content_type: "product", value: priceTnd, currency: CURRENCY });
  }, [sku, priceTnd]);

  // StickyCta: shown once every [data-sticky-anchor] zone (the buy box, mobile) has left the
  // screen. Observing a tall zone rather than the button means a fast fling still flips it.
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
    track("InitiateCheckout", { content_ids: sku, value: priceTnd, currency: CURRENCY, num_items: 1 });
  }, [sku, priceTnd]);
  const close = useCallback(() => setOpen(false), []);
  const ctx = useMemo(() => ({ available: true, isOpen, open, close }), [isOpen, open, close]);

  // /packs/<slug>#commander opens the checkout right away.
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

  // With cacheComponents, Next keeps the left page alive but hidden (React <Activity>), so after
  // the redirect to /merci the filled form (name, phone, exact address) would stay in the DOM and
  // reappear on « back ». Hiding runs effect cleanups: wipe the form and close the sheet then.
  useEffect(
    () => () => {
      if (!ordered.current) return;
      ordered.current = false;
      setOpen(false);
      setFormKey((k) => k + 1);
    },
    [],
  );

  const onSubmit = useCallback(
    (order: CheckoutSubmission) => submitOrder({ ...order, productSku: sku, source: source.current }),
    [sku],
  );
  const onSuccess = useCallback(
    (ref: string) => {
      track("Lead", { content_ids: sku, value: priceTnd, currency: CURRENCY });
      ordered.current = true;
      router.push(`/merci/${encodeURIComponent(ref)}`);
    },
    [router, sku, priceTnd],
  );

  return (
    <CheckoutContext.Provider value={ctx}>
      {children}
      {sticky ? <StickyCta className="lg:hidden" visible={!anchorVisible && !isOpen} price={priceTnd} onClick={open} /> : null}
      <BottomSheet open={isOpen} onClose={close} title="Finalise ta commande" subtitle="Tu paies à la livraison">
        <CheckoutForm key={formKey} price={priceTnd} productName={name} productImage={product.image ?? null} onSubmit={onSubmit} onSuccess={onSuccess} />
      </BottomSheet>
    </CheckoutContext.Provider>
  );
}
