import Link from "next/link";
import { cx } from "@/lib/cx";
import type { LogoName } from "@/lib/logos";
import { Icon } from "./Icon";
import { Wordmark } from "./Wordmark";

export interface NavbarProps {
  logoSrc?: LogoName;
  logoHeight?: number;
  /** Orange badge on the cart. */
  count?: number;
  onMenu?: () => void;
  onCart?: () => void;
  menuExpanded?: boolean;
  menuControls?: string;
  className?: string;
}

export const iconButtonClass =
  "relative inline-grid size-11 flex-none cursor-pointer place-items-center rounded-md text-ink no-underline hover:bg-surface-sunken";

/** Discreet sticky bar (56px): menu · centred wordmark · cart that opens the checkout. 44×44 targets. */
export function Navbar({ logoSrc = "wordmark", logoHeight = 20, count, onMenu, onCart, menuExpanded, menuControls, className }: NavbarProps) {
  return (
    <header className={cx("sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-2", className)}>
      <button
        type="button"
        className={iconButtonClass}
        aria-label="Ouvrir le menu"
        aria-expanded={menuExpanded}
        aria-controls={menuControls}
        aria-haspopup="dialog"
        onClick={onMenu}
      >
        <Icon name="menu" size={24} />
      </button>
      <Link href="/" aria-label="SHIFT CART, accueil" className="inline-flex min-h-11 items-center rounded-sm">
        <Wordmark src={logoSrc} height={logoHeight} priority decorative />
      </Link>
      <button
        type="button"
        className={iconButtonClass}
        aria-label={count ? `Commander (${count} article)` : "Commander"}
        aria-haspopup="dialog"
        onClick={onCart}
      >
        <Icon name="cart" size={24} />
        {count ? (
          <span
            className="absolute top-1.5 right-1 grid h-4.5 min-w-4.5 place-items-center rounded-pill bg-orange px-1.25 text-micro text-on-orange"
            aria-hidden="true"
          >
            {count}
          </span>
        ) : null}
      </button>
    </header>
  );
}
