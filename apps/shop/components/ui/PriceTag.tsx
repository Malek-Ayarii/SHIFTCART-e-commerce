import { formatAmount } from "@/lib/format";
import { Icon } from "./Icon";

export interface PriceTagProps {
  price?: number;
  currency?: string;
  /** Struck-through price: only if it really existed. */
  compareAt?: number;
  shippingLabel?: string;
}

export const chipClass = "inline-flex h-7 items-center gap-1 rounded-pill px-3 text-meta font-extrabold";

export function PriceTag({ price = 89, currency = "TND", compareAt, shippingLabel = "Livraison gratuite" }: PriceTagProps) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-price text-ink">
          {formatAmount(price)}
          <span className="ml-1 text-lg">{currency}</span>
        </span>
        {compareAt ? (
          <span className="font-semibold text-ink-muted line-through">
            {formatAmount(compareAt)} {currency}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={`${chipClass} bg-success-soft text-success`}>
          <Icon name="truck" size={16} />
          {shippingLabel}
        </span>
        <span className={`${chipClass} bg-orange-soft text-orange-ink`}>
          <Icon name="banknote" size={16} />
          Paiement à la livraison
        </span>
      </div>
    </div>
  );
}
