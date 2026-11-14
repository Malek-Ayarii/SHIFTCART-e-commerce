"use client";

import Link from "next/link";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { iconButtonClass } from "@/components/ui/Navbar";
import { Wordmark } from "@/components/ui/Wordmark";
import { cx } from "@/lib/cx";
import { PRODUCT } from "@/lib/product";
import { useDialog } from "@/lib/use-dialog";

export interface MenuOverlayProps {
  id?: string;
  open: boolean;
  onClose: () => void;
  onOrder: () => void;
  contactHref: string;
  showReviews?: boolean;
}

const linkClass =
  "flex min-h-16 items-center justify-between border-b border-line px-1 font-display text-display-lg text-ink no-underline hover:text-orange-ink";

const TILES: Array<{ icon: IconName; label: string }> = [
  { icon: "truck", label: "Livraison gratuite" },
  { icon: "banknote", label: "Paiement en espèces" },
  { icon: "clock", label: "24–48 h partout" },
];

/** Full-screen menu (Menu.dc.html, SPEC A2). */
export function MenuOverlay({ id = "sc-menu", open, onClose, onOrder, contactHref, showReviews = true }: MenuOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(open, ref, onClose);
  const external = contactHref.startsWith("http");

  return (
    <div
      id={id}
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      inert={!open}
      aria-hidden={open ? undefined : true}
      className={cx("fixed inset-0 z-50 mx-auto flex max-w-120 flex-col overflow-y-auto bg-surface text-ink", open ? "flex" : "hidden")}
    >
      <header className="flex h-14 flex-none items-center justify-between border-b border-line bg-surface px-2">
        <button type="button" data-dialog-close className={iconButtonClass} aria-label="Fermer le menu" onClick={onClose}>
          <Icon name="x" size={24} />
        </button>
        <Wordmark src="wordmark" height={20} />
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Commander"
          onClick={() => {
            onClose();
            onOrder();
          }}
        >
          <Icon name="cart" size={24} />
        </button>
      </header>

      <nav aria-label="Menu principal" className="flex flex-col gap-1 p-4">
        <Link href="/#m-pack" className={linkClass} onClick={onClose}>
          Le Pack Barista <span className="font-sans text-base font-extrabold whitespace-nowrap text-orange-ink">{PRODUCT.priceTnd} TND</span>
        </Link>
        <Link href="/#m-economies" className={linkClass} onClick={onClose}>
          Calcule tes économies
        </Link>
        {showReviews ? (
          <Link href="/#m-avis" className={linkClass} onClick={onClose}>
            Avis clients
          </Link>
        ) : null}
        <Link href="/suivi" className={linkClass} onClick={onClose}>
          Suivre ma commande
        </Link>
      </nav>

      <div className="flex flex-col gap-3 px-4">
        <div className="grid grid-cols-3 gap-2">
          {TILES.map((t) => (
            <div key={t.label} className="flex flex-col items-start gap-1.5 rounded-md bg-surface-raised p-3 ring-inset-line">
              <span className="text-orange-ink">
                <Icon name={t.icon} size={20} />
              </span>
              <span className="text-meta leading-4">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 p-4">
        <Button
          variant="primary"
          size="xl"
          block
          iconRight="zap"
          onClick={() => {
            onClose();
            onOrder();
          }}
        >
          Obtenir mon pack
        </Button>
        <Button variant="ghost" size="md" block icon="whatsapp" href={contactHref} target={external ? "_blank" : undefined}>
          Une question ? Écris-nous
        </Button>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Wordmark src="mark" height={24} decorative />
          <span className="text-xs leading-4 font-bold tracking-[0.12em] text-ink-muted">E-SHOP &amp; ROUTINE</span>
        </div>
      </div>
    </div>
  );
}
