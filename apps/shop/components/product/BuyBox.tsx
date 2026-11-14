import { CheckoutCta } from "@/components/checkout/CheckoutContext";
import { Icon } from "@/components/ui/Icon";
import { PriceTag } from "@/components/ui/PriceTag";
import { AVAILABILITY_COPY, type Pack } from "@/lib/catalog-map";
import { cx } from "@/lib/cx";

/** Availability: word + icon + colour (never the colour alone). */
export function AvailabilityLine({ availability }: { availability: Pack["availability"] }) {
  const inStock = availability === "IN_STOCK";
  return (
    <p className={cx("flex items-center gap-2 text-body-md font-bold", inStock ? "text-success" : "text-warning")} data-testid="availability">
      <Icon name={inStock ? "check" : "clock"} size={18} strokeWidth={2.5} />
      {AVAILABILITY_COPY[availability]}
    </p>
  );
}

/**
 * Buy box (docs/SPEC-V2.md › Page produit): name, promise, price + free delivery + COD, giant
 * OBTENIR MON PACK (opens this pack's checkout), reassurance, availability, what's inside.
 * The mobile StickyCta watches this box ([data-sticky-anchor]).
 */
export function BuyBox({ pack }: { pack: Pack }) {
  return (
    // Phone: flush on the page (the gallery above is full-bleed, a card would cost 72px of width and
    // push the CTA below the fold). From sm: a raised card, sticky beside the gallery on desktop.
    <div className="flex flex-col gap-5 sm:rounded-lg sm:bg-surface-raised sm:p-6 sm:shadow-card sm:ring-inset-line lg:p-8" data-sticky-anchor="">
      <div className="flex flex-col gap-3">
        {pack.badge ? (
          <p className="flex items-center gap-1.5 text-eyebrow text-orange-ink">
            <Icon name="star" size={16} />
            {pack.badge}
          </p>
        ) : null}
        <h1 className="text-display-section text-balance hyphens-auto lg:text-display-lg xl:text-display-md">{pack.name}</h1>
        <p className="text-lead text-ink-muted">{pack.tagline}</p>
      </div>

      <PriceTag price={pack.priceTnd} />
      <AvailabilityLine availability={pack.availability} />

      <div className="flex flex-col gap-3">
        <CheckoutCta variant="primary" size="xl" block iconRight="zap" stickyAnchor>
          Obtenir mon pack
        </CheckoutCta>
        <p className="flex items-center justify-center gap-2 text-center text-sm leading-5 font-semibold text-ink-muted">
          <Icon name="shield" size={16} />
          Pas de carte · Tu paies en espèces à la réception
        </p>
      </div>

      {pack.items.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <p className="text-eyebrow text-ink-muted">Dans ton pack</p>
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {pack.items.map((it) => (
              <li key={it.id} className="flex items-start gap-2 text-body-md">
                <Icon name={it.gift ? "gift" : "check"} size={18} className={cx("mt-0.5", it.gift ? "text-orange-ink" : "text-success")} />
                <span>
                  {it.quantity > 1 ? `${it.quantity} × ` : ""}
                  {it.name}
                  {it.gift ? <strong className="ml-1.5 text-orange-ink">Offert</strong> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
