"use client";

import Link from "next/link";
import { useRef } from "react";
import { PackVisual } from "@/components/catalog/PackVisual";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { iconButtonClass } from "@/components/ui/Navbar";
import { Wordmark } from "@/components/ui/Wordmark";
import { packHref, type PackSummary } from "@/lib/catalog-map";
import { cx } from "@/lib/cx";
import { formatAmount } from "@/lib/format";
import { useDialog } from "@/lib/use-dialog";
import { SHOP_PHONE_DISPLAY } from "@/lib/whatsapp";

export interface MenuOverlayProps {
  id?: string;
  open: boolean;
  onClose: () => void;
  /** Active packs, in catalogue order (thumbnails + prices). */
  packs: PackSummary[];
  contactHref: string;
}

const TILES: Array<{ icon: IconName; label: string }> = [
  { icon: "pin", label: "Les 24 gouvernorats" },
  { icon: "banknote", label: "Paiement en espèces" },
  { icon: "clock", label: "24–48 h partout" },
];

const linkClass = "flex min-h-14 items-center justify-between gap-3 border-b border-line px-1 text-title text-ink no-underline hover:text-orange-ink";

/** Full-screen menu (Menu.dc.html, SPEC A2 › v2): the packs with thumbnails, tracking, WhatsApp. */
export function MenuOverlay({ id = "sc-menu", open, onClose, packs, contactHref }: MenuOverlayProps) {
  const ref = useRef<HTMLDivElement>(null);
  useDialog(open, ref, onClose, { initialFocus: "nav a" });
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
      className={cx("fixed inset-0 z-50 mx-auto max-w-120 flex-col overflow-y-auto bg-surface text-ink", open ? "flex" : "hidden")}
    >
      <header className="flex h-14 flex-none items-center justify-between border-b border-line bg-surface px-2">
        <button type="button" data-dialog-close className={iconButtonClass} aria-label="Fermer le menu" onClick={onClose}>
          <Icon name="x" size={24} />
        </button>
        <Wordmark src="wordmark" height={26} />
        <span className="size-11" aria-hidden="true" />
      </header>

      <nav aria-label="Menu principal" className="flex flex-col gap-6 p-4">
        <div className="flex flex-col gap-3">
          <p className="text-eyebrow text-ink-muted">Nos packs</p>
          {packs.length > 0 ? (
            <ul className="m-0 grid list-none gap-2 p-0">
              {packs.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={packHref(p.slug)}
                    onClick={onClose}
                    className="group flex min-h-18 items-center gap-3 rounded-md bg-surface-raised p-2 pr-4 text-ink no-underline ring-inset-line hover:ring-inset-strong"
                  >
                    <PackVisual image={p.cover} name={p.name} sizes="64px" compact frameRatio={1} className="size-16 flex-none rounded-sm" />
                    <span className="min-w-0 flex-1 text-title">{p.name}</span>
                    <span className="text-meta whitespace-nowrap text-orange-ink">{formatAmount(p.priceTnd)} TND</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link href="/" onClick={onClose} className={linkClass}>
              Voir le catalogue
            </Link>
          )}
        </div>
        <div className="flex flex-col">
          <Link href="/suivi" className={linkClass} onClick={onClose}>
            Suivre ma commande
            <Icon name="truck" size={20} className="text-ink-muted" />
          </Link>
          <Link href="/livraison" className={linkClass} onClick={onClose}>
            Livraison &amp; retours
            <Icon name="undo" size={20} className="text-ink-muted" />
          </Link>
        </div>
      </nav>

      <div className="grid grid-cols-3 gap-2 px-4">
        {TILES.map((t) => (
          <div key={t.label} className="flex flex-col items-start gap-1.5 rounded-md bg-surface-raised p-3 ring-inset-line">
            <span className="text-orange-ink">
              <Icon name={t.icon} size={20} />
            </span>
            <span className="text-meta leading-4">{t.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-3 p-4">
        <Button variant="whatsapp" size="md" block icon="whatsapp" href={contactHref} target={external ? "_blank" : undefined}>
          Une question ? Écris-nous
        </Button>
        <p className="text-center text-small text-ink-muted">WhatsApp {SHOP_PHONE_DISPLAY}</p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Wordmark src="mark" height={24} decorative />
          <span className="text-xs leading-4 font-bold tracking-[0.12em] text-ink-muted">E-SHOP &amp; ROUTINE</span>
        </div>
      </div>
    </div>
  );
}
