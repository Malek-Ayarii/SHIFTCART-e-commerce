import { CheckoutCta } from "@/components/checkout/CheckoutContext";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { PriceTag } from "./PriceTag";

export interface ProductCardProps {
  name?: string;
  pitch?: string;
  eyebrow?: string;
  price?: number;
  compareAt?: number;
  ctaLabel?: string;
  /** Opens the checkout. Without it the CTA opens the landing's checkout (CheckoutCta). */
  onBuy?: () => void;
  /** The StickyCta watches this card's CTA. */
  stickyAnchor?: boolean;
}

/** The single product card of the landing (one pack, one page). */
export function ProductCard({
  name = "Le Pack Barista",
  pitch = "Le coffee shop chez toi, pour le prix de 3 semaines de buvette.",
  eyebrow = "Best-seller",
  price,
  compareAt,
  ctaLabel = "Obtenir mon pack",
  onBuy,
  stickyAnchor,
}: ProductCardProps) {
  return (
    <article className="grid gap-4 rounded-lg bg-surface-raised p-5 shadow-card">
      <div className="flex items-center gap-1 text-label uppercase text-ink-muted">
        <Icon name="star" size={14} />
        {eyebrow}
      </div>
      <div>
        <h2 className="m-0 text-display-lg">{name}</h2>
        <p className="m-0 text-ink-muted">{pitch}</p>
      </div>
      <PriceTag price={price} compareAt={compareAt} />
      {onBuy ? (
        <Button variant="primary" size="xl" block iconRight="zap" onClick={onBuy}>
          {ctaLabel}
        </Button>
      ) : (
        <CheckoutCta variant="primary" size="xl" block iconRight="zap" stickyAnchor={stickyAnchor}>
          {ctaLabel}
        </CheckoutCta>
      )}
      <p className="m-0 flex items-center justify-center gap-2 text-center text-sm leading-5 font-semibold text-ink-muted">
        <Icon name="shield" size={16} />
        Pas de carte · Tu paies en espèces à la réception
      </p>
    </article>
  );
}
