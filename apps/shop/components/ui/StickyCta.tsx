import { cx } from "@/lib/cx";
import { Button } from "./Button";

export interface StickyCtaProps {
  visible?: boolean;
  price?: number;
  label?: string;
  onClick?: () => void;
  className?: string;
}

/** Bottom bar (price + button) shown once the main CTA has left the screen. */
export function StickyCta({ visible, price = 89, label = "Obtenir mon pack", onClick, className }: StickyCtaProps) {
  return (
    <div
      className={cx(
        "fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-120 items-center gap-3 bg-surface-raised px-4 pt-3 pb-[calc(var(--space-3)+env(safe-area-inset-bottom,0px))] shadow-lift",
        "transition-transform duration-220 ease-sc",
        visible ? "translate-y-0" : "translate-y-[110%]",
        className,
      )}
      aria-hidden={visible ? undefined : true}
      inert={!visible}
      data-testid="sticky-cta"
    >
      <div className="text-story whitespace-nowrap">
        {price} TND
        <small className="block font-sans text-xs leading-4 font-bold text-success">Livraison gratuite</small>
      </div>
      <Button variant="primary" size="md" block iconRight="zap" onClick={onClick} tabIndex={visible ? 0 : -1}>
        {label}
      </Button>
    </div>
  );
}
