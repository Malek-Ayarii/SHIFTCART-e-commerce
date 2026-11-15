import { cx } from "@/lib/cx";
import { formatAmount } from "@/lib/format";
import { Icon } from "./Icon";

export interface PriceTagProps {
  price?: number;
  currency?: string;
  /** Struck-through price: only if it really existed. */
  compareAt?: number;
  /** Optional extra chip (e.g. a real delivery offer). Nothing is claimed by default. */
  shippingLabel?: string;
  /** Smaller variant for dense layouts. */
  size?: "md" | "xl";
  className?: string;
}

export const chipClass = "inline-flex h-7 items-center gap-1 rounded-pill px-3 text-meta font-semibold";

/**
 * Price block: the amount is the focal point (big tabular figures, currency set beside it), then a
 * calm cash-on-delivery line on a raised surface — no tinted background fighting the price.
 */
export function PriceTag({ price = 89, currency = "TND", compareAt, shippingLabel, size = "xl", className }: PriceTagProps) {
  const xl = size === "xl";
  return (
    <div className={cx("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <p className="m-0 flex items-start gap-1.5 text-ink" aria-label={`${formatAmount(price)} ${currency}`}>
          <span className={xl ? "text-price-xl" : "text-price"}>{formatAmount(price)}</span>
          <span className={cx("font-display font-bold tracking-tight text-ink", xl ? "mt-1.5 text-xl" : "mt-1 text-base")}>{currency}</span>
        </p>
        {compareAt ? (
          <span className="mb-1.5 text-lg font-medium text-ink-muted line-through decoration-2">
            {formatAmount(compareAt)} {currency}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2.5 rounded-md bg-surface-raised py-1.5 pr-3.5 pl-1.5 ring-inset-line">
          <span className="grid size-8 flex-none place-items-center rounded-sm bg-success-soft text-success">
            <Icon name="banknote" size={18} />
          </span>
          <span className="flex flex-col">
            <span className="text-sm leading-5 font-semibold text-ink">Paiement à la livraison</span>
            <span className="text-xs leading-4 text-ink-muted">En espèces, au livreur</span>
          </span>
        </span>
        {shippingLabel ? (
          <span className="inline-flex items-center gap-2 rounded-md bg-surface-raised px-3 text-sm font-semibold text-ink ring-inset-line">
            <Icon name="truck" size={18} className="text-ink-muted" />
            {shippingLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
