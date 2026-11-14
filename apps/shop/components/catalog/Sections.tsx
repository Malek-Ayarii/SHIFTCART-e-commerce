import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ReviewCard, type ReviewCardProps } from "@/components/ui/ReviewCard";
import { Wordmark } from "@/components/ui/Wordmark";
import { packHref, type PackSummary } from "@/lib/catalog-map";
import { cx } from "@/lib/cx";
import { SHOP_PHONE_DISPLAY } from "@/lib/whatsapp";

/** Page gutter + max width shared by every v2 section. */
export const container = "mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8";

export function SectionHeading({ eyebrow, title, intro, id, className }: { eyebrow?: string; title: ReactNode; intro?: ReactNode; id?: string; className?: string }) {
  return (
    <div className={cx("flex max-w-measure flex-col gap-3", className)}>
      {eyebrow ? <p className="text-eyebrow text-orange-ink">{eyebrow}</p> : null}
      <h2 id={id} className="text-display-section text-balance">
        {title}
      </h2>
      {intro ? <p className="text-lead text-ink-muted">{intro}</p> : null}
    </div>
  );
}

export const GUARANTEES: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: "truck", title: "Livraison gratuite", text: "Partout en Tunisie, les 24 gouvernorats." },
  { icon: "banknote", title: "Paiement en espèces", text: "Tu paies au livreur, à la réception." },
  { icon: "clock", title: "24–48 h partout", text: "Le livreur t'appelle avant de passer." },
  { icon: "whatsapp", title: "Confirmation WhatsApp", text: "Un message, tu réponds OUI, c'est parti." },
];

/** Reassurance band (ink): delivery, cash, delay, WhatsApp. */
export function GuaranteesBand({ className }: { className?: string }) {
  return (
    <section aria-label="Nos garanties" className={cx("bg-ink text-ink-inverse", className)}>
      <ul className={cx(container, "m-0 grid list-none grid-cols-2 gap-x-4 gap-y-6 py-8 lg:grid-cols-4 lg:gap-8 lg:py-10")}>
        {GUARANTEES.map((g) => (
          <li key={g.title} className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-3">
            <span className="text-orange">
              <Icon name={g.icon} size={26} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-title">{g.title}</span>
              <span className="text-small opacity-75">{g.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const STEPS = [
  { title: "Commande en 30 secondes", text: "Nom, téléphone, gouvernorat et adresse. Pas de compte, pas de carte bancaire." },
  { title: "Confirme sur WhatsApp", text: "Un message arrive sur ton téléphone : réponds OUI, on prépare ton colis." },
  { title: "Paie à la livraison", text: "En espèces, au livreur, sous 24 à 48 h partout en Tunisie. Rien à payer avant." },
];

/** The 3 steps (a real sequence, hence the numbers). */
export function HowItWorks({ id = "comment-ca-marche", className }: { id?: string; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className={cx("scroll-mt-20", className)}>
      <div className={cx(container, "flex flex-col gap-8 lg:gap-12")}>
        <SectionHeading id={`${id}-t`} title="Comment ça marche" intro="Pas de compte, pas de panier, pas de carte : tu choisis ton pack, on te l'apporte." />
        <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 lg:gap-6">
          {STEPS.map((s, i) => {
            const last = i === STEPS.length - 1;
            return (
              <li
                key={s.title}
                className={cx("flex flex-col gap-3 rounded-lg p-6 lg:p-8", last ? "bg-ink text-ink-inverse" : "bg-surface-raised shadow-card")}
              >
                <span className={cx("text-step-num", last ? "text-orange" : "text-orange-ink")} aria-hidden="true">
                  {i + 1}
                </span>
                <p className="text-heading">{s.title}</p>
                <p className={cx("text-body-md", last ? "opacity-80" : "text-ink-muted")}>{s.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** Reviews (placeholders hidden in production: no fake reviews). */
export function ReviewsSection({ reviews, className }: { reviews: ReviewCardProps[]; className?: string }) {
  if (reviews.length === 0) return null;
  return (
    <section id="avis" aria-labelledby="avis-t" className={cx("scroll-mt-20", className)}>
      <div className={cx(container, "flex flex-col gap-8")}>
        <SectionHeading id="avis-t" title="Ils ont choisi de changer" />
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.map((r) => (
            <ReviewCard key={`${r.name}-${r.city}`} {...r} />
          ))}
        </div>
      </div>
    </section>
  );
}

const footLink = "inline-flex min-h-11 items-center text-ink-inverse underline decoration-1 underline-offset-4 hover:text-orange";

export function SiteFooter({ packs, contactHref, socials = [] }: { packs: PackSummary[]; contactHref: string; socials?: Array<{ label: string; href: string }> }) {
  const external = contactHref.startsWith("http");
  return (
    <footer className="bg-ink pb-28 text-ink-inverse lg:pb-0">
      <div className={cx(container, "grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr] lg:py-16")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 flex-none place-items-center rounded-pill bg-surface-raised">
              <Wordmark src="mark" height={34} decorative />
            </span>
            <span className="flex flex-col">
              <span className="font-display text-lg font-extrabold tracking-[0.1em]">SHIFT CART</span>
              <span className="text-xs font-bold tracking-[0.12em] opacity-70">E-SHOP &amp; ROUTINE</span>
            </span>
          </div>
          <p className="max-w-80 text-small opacity-75">Des packs routine pour bosser, réviser et vivre mieux, livrés partout en Tunisie. Tu paies à la livraison.</p>
          <a
            href={contactHref}
            className="inline-flex min-h-11 items-center gap-2 self-start font-bold text-ink-inverse no-underline hover:text-orange"
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
          >
            <Icon name="whatsapp" size={20} />
            WhatsApp {SHOP_PHONE_DISPLAY}
          </a>
        </div>
        {packs.length > 0 ? (
          <nav aria-label="Nos packs" className="flex flex-col">
            <p className="mb-1 text-eyebrow opacity-70">Nos packs</p>
            {packs.map((p) => (
              <Link key={p.slug} href={packHref(p.slug)} className={footLink}>
                {p.name}
              </Link>
            ))}
          </nav>
        ) : null}
        <nav aria-label="Liens utiles" className="flex flex-col">
          <p className="mb-1 text-eyebrow opacity-70">Aide</p>
          <Link href="/suivi" className={footLink}>
            Suivre ma commande
          </Link>
          <Link href="/livraison" className={footLink}>
            Livraison &amp; retours
          </Link>
          <a href={contactHref} className={footLink} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
            Nous contacter sur WhatsApp
          </a>
          {socials.map((s) => (
            <a key={s.label} href={s.href} className={footLink} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="border-t border-ink-inverse/15">
        <p className={cx(container, "py-5 text-xs opacity-70")}>© 2026 SHIFT CART · Paiement à la livraison partout en Tunisie</p>
      </div>
    </footer>
  );
}
