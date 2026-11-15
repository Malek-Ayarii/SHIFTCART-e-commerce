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

const navLink =
  "relative inline-flex min-h-11 items-center text-body-md font-semibold text-ink no-underline transition-colors hover:text-orange-ink " +
  "after:absolute after:inset-x-0 after:bottom-2 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-pill after:bg-orange after:transition-transform after:duration-300 after:content-[''] hover:after:scale-x-100";

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
      <span className="grid size-9 place-items-center rounded-pill bg-whatsapp text-on-whatsapp">
        <Icon name="whatsapp" size={20} />
      </span>
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
        <header className="sticky top-0 z-30 hidden border-b border-line bg-surface/85 backdrop-blur-md lg:block">
          <div className="mx-auto flex max-w-container items-center gap-10 px-8 py-3">
            <Link href="/" aria-label="NEXO SHIFT, accueil" className="flex min-h-11 items-center gap-2.5 rounded-sm no-underline">
              <Wordmark src="wordmark" height={34} decorative priority />
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
              <Button variant="whatsapp" size="md" icon="whatsapp" href={contactHref} target={external ? "_blank" : undefined}>
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
