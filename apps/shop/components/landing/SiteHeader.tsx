"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { iconButtonClass, Navbar } from "@/components/ui/Navbar";
import { Wordmark } from "@/components/ui/Wordmark";
import type { PackSummary } from "@/lib/catalog-map";
import { cx } from "@/lib/cx";
import { MenuOverlay } from "./MenuOverlay";

export interface SiteHeaderProps {
  packs: PackSummary[];
  contactHref: string;
  /** Mobile-only header (the 480px tracking column). */
  compact?: boolean;
  className?: string;
}

const navLink = "inline-flex min-h-11 items-center text-body-md font-bold text-ink no-underline hover:text-orange-ink";

/**
 * v2 header: no cart (one order = one pack, from its page). Mobile: menu · logo · WhatsApp.
 * Desktop (≥ 1024px): logo · packs / how it works / tracking · WhatsApp.
 */
export function SiteHeader({ packs, contactHref, compact, className }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const external = contactHref.startsWith("http");
  const whatsapp = (
    <a
      href={contactHref}
      className={iconButtonClass}
      aria-label="Nous écrire sur WhatsApp"
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      <Icon name="whatsapp" size={24} />
    </a>
  );

  return (
    <>
      <Navbar
        className={cx(!compact && "lg:hidden", className)}
        onMenu={() => setMenuOpen(true)}
        menuExpanded={menuOpen}
        menuControls="sc-menu"
        end={whatsapp}
      />
      {compact ? null : (
        <header className="sticky top-0 z-30 hidden border-b border-line bg-surface/95 backdrop-blur-sm lg:block">
          <div className="mx-auto flex max-w-container items-center gap-10 px-8 py-3">
            <Link href="/" aria-label="SHIFT CART, accueil" className="flex min-h-11 items-center gap-2.5 rounded-sm no-underline">
              <Wordmark src="mark" height={36} decorative priority />
              <Wordmark src="wordmark" height={18} decorative priority />
            </Link>
            <nav aria-label="Menu principal" className="flex flex-wrap gap-7">
              <Link href="/#packs" className={navLink}>
                Les packs
              </Link>
              <Link href="/#comment-ca-marche" className={navLink}>
                Comment ça marche
              </Link>
              <Link href="/suivi" className={navLink}>
                Suivre ma commande
              </Link>
            </nav>
            <div className="ml-auto">
              <Button variant="ghost" size="md" icon="whatsapp" href={contactHref} target={external ? "_blank" : undefined}>
                Une question ?
              </Button>
            </div>
          </div>
        </header>
      )}
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} packs={packs} contactHref={contactHref} />
    </>
  );
}
